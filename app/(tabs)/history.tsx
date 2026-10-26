import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  Modal,
  Linking,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import {
  Clock3,
  CalendarDays,
  Briefcase,
  ChevronsDown,
  ChevronsUp,
  Clock,
  ListFilter,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  Plus,
  Wallet,
  Pencil,
  Check,
  MapPin,
} from 'lucide-react-native';
import { useAttendanceStore, calculateTotalSalary, formatCurrency } from '@/store/attendanceStore';
import SessionRow from '@/components/SessionRow';
import MonthFilter from '@/components/MonthFilter';
import EditTimeModal from '@/components/EditTimeModal';
import { Ionicons } from '@expo/vector-icons';
import { calculateSessionDuration } from '@/lib/dateUtils';

const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m}m`;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthYearFromDate(dateStr: string): string {
  const [year, month] = dateStr.split('-');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function HistoryScreen() {
  const { allGrouped, monthlyGrouped, monthlyTotalHours, loading, loadMonthly, loadAll, reloadAll, deleteSession, updateSession, insertManualSession, places, currentPlaceId, isInitialized, currentHourlyRate, setHourlyRate } = useAttendanceStore();
  const currentPlaceName = places.find((p) => p.id === currentPlaceId)?.name || 'Default';
  const currentMonthKey = getCurrentMonthKey();

  const [expandedMonths, setExpandedMonths] = useState<string[]>([currentMonthKey]);

  // Salary editing modal state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryInputVal, setSalaryInputVal] = useState(currentHourlyRate > 0 ? String(currentHourlyRate) : '');
  const [isSavingSalary, setIsSavingSalary] = useState(false);

  useEffect(() => {
    setSalaryInputVal(currentHourlyRate > 0 ? String(currentHourlyRate) : '');
  }, [currentHourlyRate, currentPlaceId]);

  const handleSaveSalaryRate = async () => {
    setIsSavingSalary(true);
    try {
      const clean = salaryInputVal.replace(/[^0-9]/g, '');
      const rate = clean ? parseInt(clean, 10) : 0;
      await setHourlyRate(rate);
      setShowSalaryModal(false);
    } catch (e) {
      console.error('Failed to save salary rate:', e);
    } finally {
      setIsSavingSalary(false);
    }
  };

  // Group by month - Memoized to prevent stability issues (fixes blank records)
  const groupedByMonth = React.useMemo(() => {
    const grouped: { [monthKey: string]: typeof allGrouped } = {};
    allGrouped.forEach((group) => {
      const monthKey = group.date.substring(0, 7); // YYYY-MM
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(group);
    });
    return grouped;
  }, [allGrouped]);

  const monthKeys = React.useMemo(() =>
    Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a)),
    [groupedByMonth]);

  // Month filter state - null means no filter (show all)
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [showMonthFilter, setShowMonthFilter] = useState(false);

  // Export format picker state
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [pendingExportMonth, setPendingExportMonth] = useState<{ monthKey: string; monthData: any[] } | null>(null);
  const exportAnim = useRef(new Animated.Value(0)).current;

  // Manual attendance entry state
  const [manualPopupVisible, setManualPopupVisible] = useState(false);

  const handleManualConfirm = async (inDate: Date, inHour: string, inMinute: string, outDate: Date, outHour: string, outMinute: string) => {
    const formatDateKey = (date: Date): string => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const dateKey = formatDateKey(inDate);
    const inTime = `${inHour}:${inMinute}`;
    const outTime = `${outHour}:${outMinute}`;
    const outDateKey = formatDateKey(outDate);

    await insertManualSession(dateKey, inTime, outTime, outDateKey);
    setManualPopupVisible(false);
  };

  // Animate export picker
  useEffect(() => {
    if (showExportPicker) {
      Animated.timing(exportAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(exportAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showExportPicker]);

  // Export format handler
  const handleExport = (format: 'csv' | 'txt' | 'whatsapp'): void => {
    if (!pendingExportMonth) return;
    const { monthKey, monthData } = pendingExportMonth;
    const [yearStr, monthNumStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthDisplay = months[monthNum - 1];

    // Number of days in this month (1 to 28/29/30/31)
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    // Map existing sessions by date key (YYYY-MM-DD)
    const sessionsByDate = new Map<string, any[]>();
    monthData.forEach((group: any) => {
      sessionsByDate.set(group.date, group.sessions || []);
    });

    let totalWorkMinutes = 0;
    let hadirDays = 0;
    let offDays = 0;

    const dailyRows: Array<{
      dayNum: number;
      dayName: string;
      formattedDate: string;
      hasAttendance: boolean;
      sessionPairsText: string;
      dayDurationText: string;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(monthNum).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const dateObj = new Date(year, monthNum - 1, d);
      const dayName = days[dateObj.getDay()];
      const formattedDate = `${dayStr}/${monthStr}/${year}`;

      const sessions = sessionsByDate.get(dateKey) || [];

      if (sessions.length > 0) {
        hadirDays++;
        let dayMinutes = 0;
        const sessionPairs = sessions.map((session: any) => {
          const inTime = session.in_time;
          const outTime = session.out_time || '??';
          if (session.out_time) {
            const dur = calculateSessionDuration(session.in_time, session.out_time, session.date || dateKey, session.out_date);
            dayMinutes += dur;
          }
          return `(${inTime} - ${outTime})`;
        });

        totalWorkMinutes += dayMinutes;

        dailyRows.push({
          dayNum: d,
          dayName,
          formattedDate,
          hasAttendance: true,
          sessionPairsText: sessionPairs.join(' '),
          dayDurationText: formatDuration(dayMinutes),
        });
      } else {
        offDays++;
        dailyRows.push({
          dayNum: d,
          dayName,
          formattedDate,
          hasAttendance: false,
          sessionPairsText: 'OFF / Tidak Hadir',
          dayDurationText: '0j 0m',
        });
      }
    }

    const totalWorkDurationText = formatDuration(totalWorkMinutes);
    const totalSalary = calculateTotalSalary(totalWorkMinutes, currentHourlyRate);

    let content = '';
    let fileName = '';
    let mimeType = 'text/plain';
    let uti = 'public.plain-text';

    if (format === 'csv') {
      fileName = `Absensi_${monthDisplay}_${year}_${currentPlaceName.replace(/\s+/g, '_')}.csv`;
      mimeType = 'text/csv';
      uti = 'public.comma-separated-values-text';

      content = `Absensi ${monthDisplay} ${year} - ${currentPlaceName}\n\n`;
      content += `Tanggal,Hari,Waktu Absen,Durasi,Status\n`;

      dailyRows.forEach((row) => {
        if (row.hasAttendance) {
          content += `${row.formattedDate},${row.dayName},"${row.sessionPairsText}",${row.dayDurationText},Hadir\n`;
        } else {
          content += `${row.formattedDate},${row.dayName},"-",0j 0m,OFF / Tidak Hadir\n`;
        }
      });

      content += `\nRINGKASAN BULANAN\n`;
      content += `Total Hari Dalam Sebulan,${daysInMonth} hari\n`;
      content += `Total Hari Hadir,${hadirDays} hari\n`;
      content += `Total Hari OFF / Tidak Hadir,${offDays} hari\n`;
      content += `Total Jam Kerja,${totalWorkDurationText}\n`;
      if (currentHourlyRate > 0) {
        content += `Tarif Gaji / Jam,Rp ${currentHourlyRate.toLocaleString('id-ID')}\n`;
        content += `Total Gaji,Rp ${totalSalary.toLocaleString('id-ID')}\n`;
      }
    } else if (format === 'txt') {
      fileName = `Absensi_${monthDisplay}_${year}_${currentPlaceName.replace(/\s+/g, '_')}.txt`;

      content = `Absensi ${monthDisplay} ${year} - ${currentPlaceName}\n\n`;

      dailyRows.forEach((row) => {
        if (row.hasAttendance) {
          content += `${row.dayName} ${row.formattedDate}:\n${row.sessionPairsText} [${row.dayDurationText}]\n\n`;
        } else {
          content += `${row.dayName} ${row.formattedDate}:\nOFF / Tidak Hadir\n\n`;
        }
      });

      content += `----------------------------------------\n`;
      content += `RINGKASAN BULANAN:\n`;
      // content += `• Total Hari Dalam Sebulan: ${daysInMonth} hari\n`;
      content += `• Total Hari Hadir: ${hadirDays} hari\n`;
      content += `• Total Hari OFF / Tidak Hadir: ${offDays} hari\n`;
      content += `• Total Jam Kerja: ${totalWorkDurationText}\n`;
      if (currentHourlyRate > 0) {
        content += `• Tarif Gaji / Jam: Rp ${currentHourlyRate.toLocaleString('id-ID')}\n`;
        content += `• Total Gaji: Rp ${totalSalary.toLocaleString('id-ID')}\n`;
      }
      content += `----------------------------------------\n`;
      content += `Staffly App`;
    } else if (format === 'whatsapp') {
      content = `*Absensi ${monthDisplay} ${year}*\n*${currentPlaceName}*\n\n`;

      dailyRows.forEach((row) => {
        if (row.hasAttendance) {
          content += `*${row.dayName}* ${row.formattedDate}:\n${row.sessionPairsText} [${row.dayDurationText}]\n\n`;
        } else {
          content += `*${row.dayName}* ${row.formattedDate}:\nOFF / Tidak Hadir\n\n`;
        }
      });

      content += `━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `*RINGKASAN BULANAN:*\n`;
      // content += `• *Total Hari Sebulan:* ${daysInMonth} hari\n`;
      content += `• *Total Hari Hadir:* ${hadirDays} hari\n`;
      content += `• *Total Hari OFF / Tidak Hadir:* ${offDays} hari\n`;
      content += `• *Total Jam Kerja:* ${totalWorkDurationText}\n`;
      if (currentHourlyRate > 0) {
        content += `• *Tarif Gaji / Jam:* Rp ${currentHourlyRate.toLocaleString('id-ID')}\n`;
        content += `• *Total Gaji:* Rp ${totalSalary.toLocaleString('id-ID')}\n`;
      }
      content += `━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `Staffly App`;

      if (Platform.OS === 'web') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(content)}`;
        window.open(whatsappUrl, '_blank');
        setShowExportPicker(false);
        setPendingExportMonth(null);
        return;
      } else {
        const appUrl = `whatsapp://send?text=${encodeURIComponent(content)}`;
        const webUrl = `https://wa.me/?text=${encodeURIComponent(content)}`;
        Linking.openURL(appUrl)
          .catch(() => Linking.openURL(webUrl))
          .catch(() => {
            Alert.alert('Info', 'WhatsApp tidak terinstall atau tidak dapat dibuka');
          })
          .finally(() => {
            setShowExportPicker(false);
            setPendingExportMonth(null);
          });
        return;
      }
    }

    (async () => {
      try {
        if (Platform.OS === 'web') {
          const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
          return;
        }

        const available = await Sharing.isAvailableAsync();
        if (!available) {
          Alert.alert('Info', 'Fitur share/export tidak tersedia di perangkat ini.');
          return;
        }

        const fileUri = (documentDirectory || '') + fileName;
        await writeAsStringAsync(fileUri, content);
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Share Absensi ${monthDisplay} ${year}`,
          UTI: uti,
        });
      } catch (e) {
        Alert.alert('Gagal', 'Export gagal. Coba lagi.');
        console.error('[Export] Error:', e);
      } finally {
        setShowExportPicker(false);
        setPendingExportMonth(null);
      }
    })();
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await reloadAll();
    setRefreshing(false);
  }, [reloadAll]);

  // Only reload on focus when data is already initialized (avoids double-load on first mount).
  // The home screen's loadInitial handles the first load for the whole app.
  useFocusEffect(
    React.useCallback(() => {
      if (isInitialized) {
        reloadAll();
      }
    }, [isInitialized, reloadAll])
  );

  // Determine which months to show
  const isFilterActive = filterYear !== null && filterMonth !== null;
  const allMonthKeys = isFilterActive
    ? monthKeys.filter((key) => {
      const [year, month] = key.split('-').map(Number);
      return year === filterYear && month === (filterMonth ?? 0) + 1;
    })
    : monthKeys;

  const effectiveExpandedMonths = isFilterActive
    ? allMonthKeys
    : expandedMonths;

  const displayMonthKey = isFilterActive && filterYear !== null && filterMonth !== null
    ? `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`
    : currentMonthKey;
  const displayMonthData = groupedByMonth[displayMonthKey] || [];

  const displayMonthTotalMinutes = calculateMonthTotalMinutes(displayMonthData);
  const displayMonthSalary = calculateTotalSalary(displayMonthTotalMinutes, currentHourlyRate);
  const displayTotalDays = displayMonthData.length;
  const displayTotalSessions = displayMonthData.reduce((acc: number, g: { sessions: any[] }) => acc + g.sessions.length, 0);

  function calculateMonthTotalMinutes(monthData: typeof allGrouped): number {
    let totalMinutes = 0;
    for (const group of monthData) {
      for (const s of group.sessions) {
        if (s.out_time) {
          totalMinutes += calculateSessionDuration(s.in_time, s.out_time, s.date || group.date, s.out_date);
        }
      }
    }
    return totalMinutes;
  }

  function toggleMonth(monthKey: string) {
    setExpandedMonths((prev) =>
      prev.includes(monthKey) ? prev.filter((k) => k !== monthKey) : [...prev, monthKey]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#29b0f9']} />
        }
      >
        <View style={styles.header}>
          <Image source={require('@/assets/images/Staffly.png')} style={styles.logo} />
          <Text style={styles.appName}>Staffly</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerFilterButton}
              onPress={() => setShowMonthFilter(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isFilterActive ? ['#F43F5E', '#e11d48'] : ['#29b0f9', '#0ea5e9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerFilterGradient}
              >
                <ListFilter size={14} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.headerFilterText}>
                  {isFilterActive && filterMonth !== null && filterYear !== null
                    ? (() => {
                      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                      return `${months[filterMonth]} ${filterYear}`;
                    })()
                    : 'Filter'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unified Hero Overview Card */}
        <LinearGradient
          colors={['#29b0f9', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroOverviewCard}
        >
          {/* Card Header: Month Title & Add Manual Button */}
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroHeaderTitleGroup}>
              <Text style={styles.heroMonthText}>
                {isFilterActive && filterMonth !== null && filterYear !== null
                  ? (() => {
                    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    return `${months[filterMonth]} ${filterYear}`;
                  })()
                  : getCurrentMonthYear()}
              </Text>
              <View style={styles.heroPlaceRow}>
                <MapPin size={12} color="rgba(255, 255, 255, 0.9)" strokeWidth={2.4} />
                <Text style={styles.heroPlaceBadge}>{currentPlaceName}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.heroAddBtn}
              onPress={() => setManualPopupVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.heroAddBtnText}>Absen Manual</Text>
            </TouchableOpacity>
          </View>

          {/* Main 2-Column Metrics: Jam Kerja & Total Gaji */}
          <View style={styles.heroMetricsRow}>
            {/* Left: Total Jam Kerja */}
            <View style={styles.heroMetricCol}>
              <View style={styles.heroMetricHeader}>
                <Briefcase size={14} color="#DBEAFE" strokeWidth={2.4} />
                <Text style={styles.heroMetricLabel}>JAM KERJA</Text>
              </View>
              <Text style={styles.heroMetricValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatDuration(displayMonthTotalMinutes)}
              </Text>
              <Text style={styles.heroMetricSub}>Waktu bulan ini</Text>
            </View>

            {/* Vertical Divider */}
            <View style={styles.heroMetricDivider} />

            {/* Right: Total Gaji (Tap to edit) */}
            <TouchableOpacity
              style={styles.heroMetricCol}
              onPress={() => setShowSalaryModal(true)}
              activeOpacity={0.75}
            >
              <View style={styles.heroMetricHeader}>
                <Wallet size={14} color="#DBEAFE" strokeWidth={2.4} />
                <Text style={styles.heroMetricLabel}>TOTAL GAJI</Text>
                <Pencil size={11} color="rgba(255,255,255,0.8)" strokeWidth={2.4} />
              </View>
              <Text
                style={[
                  styles.heroMetricValue,
                  {
                    fontSize:
                      formatCurrency(displayMonthSalary).length > 15
                        ? 13
                        : formatCurrency(displayMonthSalary).length > 12
                        ? 15
                        : formatCurrency(displayMonthSalary).length > 10
                        ? 17
                        : 20,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {formatCurrency(displayMonthSalary)}
              </Text>
              {currentHourlyRate > 0 ? (
                <Text style={styles.heroMetricSubPill}>
                  Rp {(currentHourlyRate).toLocaleString('id-ID')} / jam
                </Text>
              ) : (
                <View style={styles.inlinePencilRow}>
                  <Text style={styles.heroMetricSubPill}>Atur Tarif Gaji</Text>
                  <Pencil size={10} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Stats Strip: Hari & Sesi */}
          <View style={styles.heroFooterStrip}>
            <View style={styles.heroFooterStat}>
              <CalendarDays size={14} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.heroFooterStatText}>
                <Text style={styles.heroFooterStatBold}>{displayTotalDays}</Text> Hari Hadir
              </Text>
            </View>
            <View style={styles.heroFooterDot} />
            <View style={styles.heroFooterStat}>
              <Clock3 size={14} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.heroFooterStatText}>
                <Text style={styles.heroFooterStatBold}>{displayTotalSessions}</Text> Sesi Tercatat
              </Text>
            </View>
          </View>
        </LinearGradient>

        {allGrouped.length === 0 ? (
          <View style={styles.emptyState}>
            <CalendarDays size={48} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Belum Ada Data Absen</Text>
            <Text style={styles.emptySubtitle}>
              Riwayat anda akan tampil disini setelah absen Masuk pertama
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {allMonthKeys.map((monthKey, monthIndex) => {
              const isExpanded = effectiveExpandedMonths.includes(monthKey);
              const monthData = groupedByMonth[monthKey];
              const monthTotalMinutes = calculateMonthTotalMinutes(monthData);
              const monthDays = monthData.length;
              const monthSessions = monthData.reduce((acc, g) => acc + g.sessions.length, 0);
              const isCurrentMonth = monthKey === currentMonthKey;

              return (
                <View key={monthKey} style={[styles.collapsibleMonth, monthIndex > 0 && styles.collapsibleMonthMargin]}>
                  <TouchableOpacity
                    onPress={() => toggleMonth(monthKey)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={isExpanded
                        ? ['#29b0f9', '#10B981']
                        : isCurrentMonth
                          ? ['#F0F9FF', '#E0F2FE']
                          : ['#F8FAFC', '#F1F5F9']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.collapsibleHeader}
                    >
                      <View style={styles.collapsibleHeaderLeft}>
                        <View style={styles.collapsibleTitleRow}>
                          <Text style={[styles.collapsibleMonthTitle, isExpanded && styles.collapsibleMonthTitleActive]}>
                            {getMonthYearFromDate(monthKey + '-01')}
                          </Text>
                          {isCurrentMonth && (
                            <View style={[styles.monthBadge, isExpanded && styles.monthBadgeActive]}>
                              <Text style={[styles.monthBadgeText, isExpanded && styles.monthBadgeTextActive]}>Bulan Ini</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.collapsibleStatsGrid}>
                          {/* Row 1: Hari & Sesi */}
                          <View style={styles.collapsibleStatsRow}>
                            <View style={styles.collapsibleStatItem}>
                              <CalendarDays size={12} color={isExpanded ? '#DBEAFE' : '#29b0f9'} strokeWidth={2.2} />
                              <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                                {monthDays} hari
                              </Text>
                            </View>
                            <View style={styles.collapsibleStatItem}>
                              <Clock size={12} color={isExpanded ? '#DBEAFE' : '#6366F1'} strokeWidth={2.2} />
                              <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                                {monthSessions} sesi
                              </Text>
                            </View>
                          </View>

                          {/* Row 2: Jam & Gaji */}
                          <View style={styles.collapsibleStatsRow}>
                            <View style={styles.collapsibleStatItem}>
                              <Briefcase size={12} color={isExpanded ? '#DBEAFE' : '#0EA5E9'} strokeWidth={2.2} />
                              <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                                {formatDuration(monthTotalMinutes)}
                              </Text>
                            </View>
                            <View style={styles.collapsibleStatItem}>
                              <Wallet size={12} color={isExpanded ? '#DBEAFE' : '#10B981'} strokeWidth={2.2} />
                              <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                                {currentHourlyRate > 0
                                  ? formatCurrency(calculateTotalSalary(monthTotalMinutes, currentHourlyRate))
                                  : 'Rp 0'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View style={styles.headerRightActions}>
                        {isExpanded && (
                          <TouchableOpacity
                            style={[styles.collapsibleArrow, isExpanded && styles.collapsibleArrowActive]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setPendingExportMonth({ monthKey, monthData });
                              setShowExportPicker(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Download size={22} color="#FFFFFF" strokeWidth={2} />
                          </TouchableOpacity>
                        )}
                        <View style={[styles.collapsibleArrow, isExpanded && styles.collapsibleArrowActive]}>
                          {isExpanded ? (
                            <ChevronsUp size={22} color="#FFFFFF" strokeWidth={2.5} />
                          ) : (
                            <ChevronsDown size={22} color={isCurrentMonth ? '#29b0f9' : '#64748B'} strokeWidth={2.5} />
                          )}
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.collapsibleContent}>
                      {monthData.map((group, index) => (
                        <SessionRow
                          key={`${group.date}-${index}`}
                          date={group.date}
                          sessions={group.sessions}
                          isFirstInMonth={index === 0}
                          onDeleteSession={deleteSession}
                          onUpdateSession={updateSession}
                        />
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <MonthFilter
        visible={showMonthFilter}
        onClose={() => setShowMonthFilter(false)}
        onSelectMonth={(year, month) => {
          setFilterYear(year);
          setFilterMonth(month);
        }}
        onClearFilter={() => {
          setFilterYear(null);
          setFilterMonth(null);
          setExpandedMonths([currentMonthKey]);
        }}
        selectedYear={filterYear ?? now.getFullYear()}
        selectedMonth={filterMonth ?? now.getMonth()}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={showExportPicker}
        onRequestClose={() => setShowExportPicker(false)}
      >
        <View style={styles.exportPickerOverlay}>
          <Animated.View style={[styles.exportPickerContainer, { opacity: exportAnim }]}>
            <LinearGradient
              colors={['#29b0f9', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exportPickerHeader}
            >
              <Text style={styles.exportPickerTitle}>Format Export</Text>
              <Text style={styles.exportPickerSubtitle}>Pilih format</Text>
            </LinearGradient>

            <View style={styles.exportPickerContent}>
              <TouchableOpacity
                style={styles.exportPickerOption}
                onPress={() => handleExport('whatsapp')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#25D366', '#128C7E']}
                  style={styles.exportOptionIcon}
                >
                  <Ionicons name="logo-whatsapp" size={30} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>WhatsApp</Text>
                  <Text style={styles.exportOptionDesc}>Share ke WhatsApp</Text>
                </View>
                <ChevronsDown size={20} color="#64748B" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportPickerOption}
                onPress={() => handleExport('csv')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#29b0f9', '#0ea5e9']}
                  style={styles.exportOptionIcon}
                >
                  <FileSpreadsheet size={28} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>CSV (Excel)</Text>
                  <Text style={styles.exportOptionDesc}>Format spreadsheet untuk Excel</Text>
                </View>
                <ChevronsDown size={20} color="#64748B" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportPickerOption}
                onPress={() => handleExport('txt')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.exportOptionIcon}
                >
                  <FileText size={28} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
                <View style={styles.exportOptionText}>
                  <Text style={styles.exportOptionTitle}>TXT (Text)</Text>
                  <Text style={styles.exportOptionDesc}>Format teks universal</Text>
                </View>
                <ChevronsDown size={20} color="#64748B" style={{ transform: [{ rotate: '-90deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportPickerCancel}
                onPress={() => setShowExportPicker(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.exportPickerCancelText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Manual Attendance Modal */}
      <EditTimeModal
        visible={manualPopupVisible}
        onClose={() => setManualPopupVisible(false)}
        onSave={handleManualConfirm}
        title="Absen Manual"
        subtitle="Catat waktu yang terlewat!"
        showOutToggle={false}
        defaultHasOut={true}
      />

      {/* Salary Rate Bottom Sheet */}
      <Modal
        visible={showSalaryModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowSalaryModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.salarySheetAvoid}
        >
          <View style={styles.salarySheetOverlay}>
            <TouchableWithoutFeedback onPress={() => setShowSalaryModal(false)}>
              <View style={styles.salarySheetBackdrop} />
            </TouchableWithoutFeedback>

            <View style={styles.salarySheetContainer}>
              {/* Drag Handle Indicator */}
              <View style={styles.sheetHandleRow}>
                <View style={styles.sheetHandle} />
              </View>

              {/* Sheet Header */}
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.salarySheetHeader}
              >
                <View style={styles.salaryModalHeaderContent}>
                  <View style={styles.salarySheetIconBadge}>
                    <Wallet size={20} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                  <View>
                    <Text style={styles.salaryModalTitle}>Atur Tarif Gaji / Jam</Text>
                    <View style={styles.salarySheetPlaceRow}>
                      <MapPin size={12} color="rgba(255, 255, 255, 0.9)" strokeWidth={2.4} />
                      <Text style={styles.salaryModalSubtitle}>{currentPlaceName}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowSalaryModal(false)}
                  style={styles.salaryModalCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.salarySheetBody}
              >
                <Text style={styles.salaryModalLabel}>Tarif Gaji per Jam</Text>
                <View style={styles.salaryModalInputRow}>
                  <Text style={styles.salaryModalCurrency}>Rp</Text>
                  <TextInput
                    style={styles.salaryModalInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={
                      salaryInputVal
                        ? parseInt(salaryInputVal.replace(/[^0-9]/g, '') || '0', 10).toLocaleString('id-ID')
                        : ''
                    }
                    onChangeText={(text) => {
                      const raw = text.replace(/[^0-9]/g, '');
                      setSalaryInputVal(raw);
                    }}
                    autoFocus
                  />
                  {salaryInputVal ? (
                    <TouchableOpacity
                      onPress={() => setSalaryInputVal('')}
                      style={styles.salaryModalClear}
                      activeOpacity={0.7}
                    >
                      <X size={13} color="#64748B" strokeWidth={2.5} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Quick Preset Chips */}
                <View style={styles.salaryModalChips}>
                  {[10000, 20000, 50000].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={styles.salaryModalChip}
                      onPress={() => {
                        const current = salaryInputVal.replace(/[^0-9]/g, '');
                        const currentVal = current ? parseInt(current, 10) : 0;
                        setSalaryInputVal(String(currentVal + preset));
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.salaryModalChipText}>+{(preset / 1000).toLocaleString('id-ID')}rb</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.salaryModalChip, styles.salaryModalResetChip]}
                    onPress={() => setSalaryInputVal('0')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.salaryModalChipText, styles.salaryModalResetText]}>Reset</Text>
                  </TouchableOpacity>
                </View>

                {/* Live Preview of Month Total Salary */}
                <View style={styles.salaryModalPreview}>
                  <Text style={styles.salaryModalPreviewLabel}>
                    Estimasi Total ({isFilterActive && filterMonth !== null && filterYear !== null
                      ? (() => {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                        return `${months[filterMonth]} ${filterYear}`;
                      })()
                      : 'Bulan Ini'}):
                  </Text>
                  <Text
                    style={styles.salaryModalPreviewValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatCurrency(
                      calculateTotalSalary(
                        displayMonthTotalMinutes,
                        parseInt(salaryInputVal.replace(/[^0-9]/g, '') || '0', 10)
                      )
                    )}
                  </Text>
                  <Text style={styles.salaryModalPreviewHours}>
                    Berdasarkan {formatDuration(displayMonthTotalMinutes)} kerja
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.salaryModalActions}>
                  <TouchableOpacity
                    style={styles.salaryModalCancelBtn}
                    onPress={() => setShowSalaryModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.salaryModalCancelText}>Batal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.salaryModalSaveBtn, isSavingSalary && styles.btnDisabled]}
                    onPress={handleSaveSalaryRate}
                    disabled={isSavingSalary}
                    activeOpacity={0.85}
                  >
                    {isSavingSalary ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.salaryModalSaveRow}>
                        <Check size={18} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={styles.salaryModalSaveText}>Simpan</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    marginBottom: 20,
  },
  logo: { width: 40, height: 40, borderRadius: 12 },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#29b0f9',
    flex: 1,
    marginHorizontal: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerFilterButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  headerFilterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  headerFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroOverviewCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroHeaderTitleGroup: {
    flex: 1,
  },
  heroMonthText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  heroPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  heroPlaceBadge: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  inlinePencilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  heroAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  heroMetricCol: {
    flex: 1,
  },
  heroMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroMetricSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  heroMetricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 12,
  },
  heroMetricSubPill: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  heroFooterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 4,
  },
  heroFooterStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFooterStatText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  heroFooterStatBold: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroFooterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  totalHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  totalHoursIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  totalHoursContent: {
    flex: 1,
  },
  totalHoursTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  totalHoursValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  totalHoursSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  list: {
    gap: 16,
  },
  collapsibleMonth: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 4,
  },
  collapsibleMonthMargin: {
    marginTop: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  collapsibleHeaderLeft: {
    flex: 1,
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  collapsibleMonthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  collapsibleMonthTitleActive: {
    color: '#FFFFFF',
  },
  monthBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  monthBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  monthBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  monthBadgeTextActive: {
    color: '#FFFFFF',
  },
  collapsibleStatsGrid: {
    gap: 4,
    marginTop: 2,
  },
  collapsibleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  collapsibleStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 80,
  },
  collapsibleMonthStats: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  collapsibleMonthStatsActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsibleArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleArrowActive: {
    // backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  collapsibleContent: {
    padding: 0,
    gap: 0,
  },
  exportPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  exportPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  exportPickerHeader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  exportPickerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  exportPickerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  exportPickerContent: {
    padding: 24,
    gap: 16,
  },
  exportPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    gap: 12,
  },
  exportOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionText: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  exportOptionDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  exportPickerCancel: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  exportPickerCancelText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
  },
  addManualBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  salarySheetAvoid: {
    flex: 1,
  },
  salarySheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  salarySheetBackdrop: {
    flex: 1,
  },
  salarySheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#10B981',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  salarySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },
  salarySheetIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salarySheetPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  salarySheetBody: {
    padding: 20,
    paddingBottom: 32,
  },
  salaryModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  salaryModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  salaryModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryModalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  salaryModalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  salaryModalCurrency: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    marginRight: 6,
  },
  salaryModalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    padding: 0,
  },
  salaryModalClear: {
    padding: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryModalClearText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  salaryModalChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  salaryModalChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  salaryModalChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  salaryModalResetChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  salaryModalResetText: {
    color: '#64748B',
  },
  salaryModalPreview: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  salaryModalPreviewLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  salaryModalPreviewValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    marginBottom: 2,
  },
  salaryModalPreviewHours: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  salaryModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  salaryModalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  salaryModalSaveBtn: {
    flex: 1.4,
    paddingVertical: 13,
    backgroundColor: '#10B981',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salaryModalSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salaryModalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
