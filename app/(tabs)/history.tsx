import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image, TouchableOpacity, Animated, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { documentDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import { Clock3, CalendarDays, Briefcase, ChevronsDown, ChevronsUp, Database, Clock, Filter, Search, Download, X } from 'lucide-react-native';
import { useAttendanceStore } from '@/store/attendanceStore';
import SessionRow from '@/components/SessionRow';
import MonthFilter from '@/components/MonthFilter';

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
  const { allGrouped, loadAll, loadDemoData } = useAttendanceStore();
  const currentMonthKey = getCurrentMonthKey();

  // Default: show all months, only current month expanded
  const [expandedMonths, setExpandedMonths] = useState<string[]>([currentMonthKey]);

  // Month filter state - null means no filter (show all)
  const now = new Date();
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [showMonthFilter, setShowMonthFilter] = useState(false);

  // Search state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const handleLoadDemo = async () => {
    await loadDemoData();
  };

  // Group by month
  const groupedByMonth: { [monthKey: string]: typeof allGrouped } = {};
  allGrouped.forEach((group) => {
    const monthKey = group.date.substring(0, 7); // YYYY-MM
    if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = [];
    groupedByMonth[monthKey].push(group);
  });

  const monthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  // Determine which months to show
  const isFilterActive = filterYear !== null && filterMonth !== null;
  const allMonthKeys = isFilterActive
    ? monthKeys.filter((key) => {
        const [year, month] = key.split('-').map(Number);
        return year === filterYear && month === (filterMonth ?? 0) + 1;
      })
    : monthKeys; // Show all if no filter

  // When filter is applied, auto-expand the filtered month
  const effectiveExpandedMonths = isFilterActive
    ? allMonthKeys // All filtered months are expanded
    : expandedMonths; // Use user toggled state

  // Get data to display - if filtered, show that month's data; otherwise show current month data
  const displayMonthKey = isFilterActive && filterYear !== null && filterMonth !== null
    ? `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`
    : currentMonthKey;
  const displayMonthData = groupedByMonth[displayMonthKey] || [];

  // Calculate totals for display month (filtered or current)
  const displayMonthTotalMinutes = calculateMonthTotalMinutes(displayMonthData);
  const displayTotalDays = displayMonthData.length;
  const displayTotalSessions = displayMonthData.reduce((acc: number, g: { sessions: any[] }) => acc + g.sessions.length, 0);

  function calculateMonthTotalMinutes(monthData: typeof allGrouped): number {
    let totalMinutes = 0;
    for (const group of monthData) {
      for (const s of group.sessions) {
        if (s.out_time) {
          const [inH, inM] = s.in_time.split(':').map(Number);
          const [outH, outM] = s.out_time.split(':').map(Number);
          const duration = (outH * 60 + outM) - (inH * 60 + inM);
          if (duration > 0) totalMinutes += duration;
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
      >
        <View style={styles.header}>
          <Image source={require('@/assets/images/Staffly.png')} style={styles.logo} />
          <Text style={styles.appName}>Staffly</Text>

          {/* Action Buttons - Right side */}
          <View style={styles.headerActions}>
            {/* Search Button */}
            {/* <TouchableOpacity
              style={[styles.headerActionButton, isSearchActive && styles.headerActionButtonActive]}
              onPress={() => {
                setIsSearchActive(!isSearchActive);
                if (isSearchActive) setSearchQuery('');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isSearchActive ? ['#F59E0B', '#D97706'] : ['#6B7280', '#4B5563']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerActionGradient}
              >
                <Search size={16} color="#FFFFFF" strokeWidth={2} />
              </LinearGradient>
            </TouchableOpacity> */}

            {/* Filter Button */}
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
                <Filter size={14} color="#FFFFFF" strokeWidth={2} />
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

        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalHoursCard}
        >
          <View style={styles.totalHoursIconContainer}>
            <Briefcase size={24} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={styles.totalHoursContent}>
            <Text style={styles.totalHoursTitle}>Total Jam Kerja</Text>
            <Text style={styles.totalHoursValue}>{formatDuration(displayMonthTotalMinutes)}</Text>
            <Text style={styles.totalHoursSubtitle}>
              {isFilterActive && filterMonth !== null && filterYear !== null
                ? (() => {
                    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    return `${months[filterMonth]} ${filterYear}`;
                  })()
                : getCurrentMonthYear()}
            </Text>
          </View>
        </LinearGradient>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <CalendarDays size={20} color="#29b0f9" strokeWidth={2} />
            <Text style={styles.statNum}>{displayTotalDays}</Text>
            <Text style={styles.statLabel}>Hari</Text>
          </View>
          <View style={styles.statCard}>
            <Clock3 size={20} color="#29b0f9" strokeWidth={2} />
            <Text style={styles.statNum}>{displayTotalSessions}</Text>
            <Text style={styles.statLabel}>Sesi</Text>
          </View>
        </View>

        {/* Search Bar - Below stat cards */}
        {isSearchActive && (
          <View style={styles.searchBar}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchBarGradient}
            >
              <Search size={18} color="#FFFFFF" strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari tanggal (dd/mm/yyyy), bulan, atau tahun..."
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Demo Data Button */}
        {/* {allGrouped.length === 0 && (
          <TouchableOpacity style={styles.demoButton} onPress={handleLoadDemo}>
            <Database size={18} color="#64748B" strokeWidth={2} />
            <Text style={styles.demoButtonText}>Load Demo Data</Text>
          </TouchableOpacity>
        )} */}

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
            {/* All Months - Collapsible with gradient */}
            {allMonthKeys.map((monthKey, monthIndex) => {
              // Use effectiveExpandedMonths for expand state (auto-expanded when filtered)
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
                        <View style={styles.collapsibleStatsRow}>
                          <View style={styles.collapsibleStatItem}>
                            <CalendarDays size={12} color={isExpanded ? '#DBEAFE' : '#6B7280'} strokeWidth={2} />
                            <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                              {monthDays} hari
                            </Text>
                          </View>
                          <View style={styles.collapsibleStatItem}>
                            <Clock size={12} color={isExpanded ? '#DBEAFE' : '#6B7280'} strokeWidth={2} />
                            <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                              {monthSessions} sesi
                            </Text>
                          </View>
                          <View style={styles.collapsibleStatItem}>
                            <Briefcase size={12} color={isExpanded ? '#DBEAFE' : '#6B7280'} strokeWidth={2} />
                            <Text style={[styles.collapsibleMonthStats, isExpanded && styles.collapsibleMonthStatsActive]}>
                              {formatDuration(monthTotalMinutes)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.headerRightActions}>
                        {/* Export Button - Only show when expanded */}
                        {isExpanded && (
                          <TouchableOpacity
                            style={[styles.collapsibleArrow, isExpanded && styles.collapsibleArrowActive]}
                            onPress={(e) => {
                              e.stopPropagation();
                              // Generate CSV content with new format
                              const monthName = getMonthYearFromDate(monthKey + '-01').replace(' ', '_');
                              const [year, monthNum] = monthKey.split('-');
                              const monthDisplay = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(monthNum) - 1];

                              const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

                              let csv = `Absensi ${monthDisplay} ${year}\n\n`;

                              monthData.forEach((group) => {
                                const dateObj = new Date(group.date);
                                const dayName = days[dateObj.getDay()];
                                const [y, m, d] = group.date.split('-');
                                const formattedDate = `${d}/${m}/${y}`;

                                // Build session pairs for this date
                                const sessionPairs = group.sessions.map((session) => {
                                  const inTime = session.in_time;
                                  const outTime = session.out_time || '??';
                                  return `(${inTime} - ${outTime})`;
                                });

                                // Format: Day DD/MM/YYYY: (IN - OUT) (IN - OUT)
                                csv += `${dayName} ${formattedDate}: ${sessionPairs.join(' ')}\n`;
                              });

                              // Platform-specific file export
                              const fileName = `Absensi_${monthDisplay}_${year}.csv`;

                              if (Platform.OS === 'web') {
                                // Web: Use Web Share API or download
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                if (navigator.share && navigator.canShare && typeof navigator.canShare === 'function') {
                                  const file = new File([blob], fileName, { type: 'text/csv' });
                                  navigator.share({
                                    title: `Absensi ${monthDisplay} ${year}`,
                                    text: 'Data absensi dalam format CSV',
                                    files: [file]
                                  }).catch(() => {
                                    // Fallback to download
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = fileName;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                  });
                                } else {
                                  // Direct download
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = fileName;
                                  link.click();
                                  URL.revokeObjectURL(url);
                                }
                              } else {
                                // Mobile: Use expo-sharing with legacy API
                                const fileUri = (documentDirectory || '') + fileName;
                                writeAsStringAsync(fileUri, csv).then(() => {
                                  Sharing.shareAsync(fileUri, {
                                    mimeType: 'text/csv',
                                    dialogTitle: `Share Absensi ${monthDisplay} ${year}`,
                                    UTI: 'public.comma-separated-values-text'
                                  });
                                });
                              }
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
                          key={group.date}
                          date={group.date}
                          sessions={group.sessions}
                          isFirstInMonth={index === 0}
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

      {/* Month Filter Modal */}
      <MonthFilter
        visible={showMonthFilter}
        onClose={() => {
          // Just close the modal without resetting filter
          setShowMonthFilter(false);
        }}
        onSelectMonth={(year, month) => {
          setFilterYear(year);
          setFilterMonth(month);
        }}
        onClearFilter={() => {
          // Reset filter to show all months
          setFilterYear(null);
          setFilterMonth(null);
          // Reset expanded to default (current month only)
          setExpandedMonths([currentMonthKey]);
        }}
        selectedYear={filterYear ?? now.getFullYear()}
        selectedMonth={filterMonth ?? now.getMonth()}
      />
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
    paddingTop: 20, // 🔥 TAMBAH INI
    marginBottom: 20,
  },

  logo: { width: 40, height: 40 },

  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#29b0f9',
    flex: 1,
    marginHorizontal: 10,
  },

  clockBadge: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 20,
  },

  clockText: { fontWeight: '600', color: '#64748B' },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCardTop: {
    flex: 1,
    backgroundColor: '#29b0f9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  totalHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  totalHoursSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  list: {
    gap: 0,
  },

  // Month Header Styles
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthBadge: {
    backgroundColor: '#29b0f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: -10,
  },
  monthBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthBadgeTextActive: {
    color: '#FFFFFF',
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Previous Months Divider
  previousMonthsDivider: {
    // height: 1,
    // backgroundColor: '#E2E8F0',
    // marginVertical: 20,
  },

  // Collapsible Month Styles - Premium Gradient
  collapsibleMonth: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
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
  collapsibleMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  collapsibleMonthTitleActive: {
    color: '#FFFFFF',
  },
  collapsibleStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  collapsibleStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapsibleMonthStats: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  collapsibleMonthStatsActive: {
    color: '#DBEAFE',
  },
  collapsibleArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  collapsibleArrowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  collapsibleContent: {
    backgroundColor: '#FFFFFF',
  },

  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  headerFilterButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  headerFilterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerActionButtonActive: {
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
  },
  headerActionGradient: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBar: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBarGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    padding: 0,
  },

  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
