import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, LogOut, Clock3 } from 'lucide-react-native';
import { useAttendanceStore } from '@/store/attendanceStore';
import AttendancePopup from '@/components/AttendancePopup';
import SessionRow from '@/components/SessionRow';
import { formatDateLong, formatCurrentTimeSeconds } from '@/lib/dateUtils';

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export default function HomeScreen() {
  const { todaySessions, loadToday, loadAll, checkIn, checkOut, canCheckOut } =
    useAttendanceStore();

  // 🔥 LOGIC
  const hasActiveSession = todaySessions.some((s) => !s.out_time);
  const inEnabled = !hasActiveSession;
  const outEnabled = canCheckOut();

  const [popup, setPopup] = useState<'MASUK' | 'KELUAR' | null>(null);
  const [liveTime, setLiveTime] = useState(formatCurrentTimeSeconds());

  const inScale = useRef(new Animated.Value(1)).current;
  const outScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadToday();
    loadAll();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(formatCurrentTimeSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function pressIn(btn: 'MASUK' | 'KELUAR') {
    const anim = btn === 'MASUK' ? inScale : outScale;
    Animated.spring(anim, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
  }

  function pressOut(btn: 'MASUK' | 'KELUAR') {
    const anim = btn === 'MASUK' ? inScale : outScale;
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  }

  async function handleConfirm() {
    try {
      if (popup === 'MASUK') await checkIn();
      else if (popup === 'KELUAR') await checkOut();
      setPopup(null);
    } catch (err) {
      console.error('[handleConfirm] Error:', err);
      throw err; // Re-throw so AttendancePopup can show error
    }
  }

  const today = new Date();
  const todayKey = getTodayKey();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Image source={require('@/assets/images/Staffly.png')} style={styles.logo} />
          <Text style={styles.appName}>Staffly</Text>

          <View style={styles.clockBadge}>
            <Clock3 size={13} color="#64748B" strokeWidth={2} />
            <Text style={styles.clockText}>{liveTime}</Text>
          </View>
        </View>

        {/* DATE */}
        <LinearGradient
          colors={['#29b0f9', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.dateCard}
        >
          <Text style={styles.dayName}>Hari ini</Text>
          <Text style={styles.dateFull}>{formatDateLong(today)}</Text>
        </LinearGradient>

        {/* BUTTONS */}
        <View style={styles.btnRow}>
          
          {/* MASUK */}
          <Animated.View style={{ flex: 1, transform: [{ scale: inScale }] }}>
            <TouchableOpacity
              style={[styles.actionBtn, !inEnabled && styles.disabledBtn]}
              onPress={() => inEnabled && setPopup('MASUK')}
              onPressIn={() => inEnabled && pressIn('MASUK')}
              onPressOut={() => inEnabled && pressOut('MASUK')}
              disabled={!inEnabled}
              activeOpacity={inEnabled ? 0.8 : 1}
            >
              {inEnabled ? (
                <LinearGradient
                  colors={['#29b0f9', '#0ea5e9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBtn}
                >
                  <LogIn size={26} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.btnLabel}>MASUK</Text>
                  <Text style={styles.btnSub}>Absen Masuk</Text>
                </LinearGradient>
              ) : (
                <View style={styles.disabledBtnContent}>
                  <LogIn size={26} color="#94A3B8" strokeWidth={2.2} />
                  <Text style={[styles.btnLabel, styles.disabledText]}>MASUK</Text>
                  <Text style={[styles.btnSub, styles.disabledText]}>Sudah Masuk</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* KELUAR */}
          <Animated.View style={{ flex: 1, transform: [{ scale: outScale }] }}>
            <TouchableOpacity
              style={[styles.actionBtn, !outEnabled && styles.disabledBtn]}
              onPress={() => outEnabled && setPopup('KELUAR')}
              onPressIn={() => outEnabled && pressIn('KELUAR')}
              onPressOut={() => outEnabled && pressOut('KELUAR')}
              disabled={!outEnabled}
              activeOpacity={outEnabled ? 0.8 : 1}
            >
              {outEnabled ? (
                <LinearGradient
                  colors={['#F43F5E', '#e11d48']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBtn}
                >
                  <LogOut size={26} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.btnLabel}>KELUAR</Text>
                  <Text style={styles.btnSub}>Absen Keluar</Text>
                </LinearGradient>
              ) : (
                <View style={styles.disabledBtnContent}>
                  <LogOut size={26} color="#94A3B8" strokeWidth={2.2} />
                  <Text style={[styles.btnLabel, styles.disabledText]}>KELUAR</Text>
                  <Text style={[styles.btnSub, styles.disabledText]}>Belum Absen Masuk</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* SESSION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Absen Hari ini</Text>

          {todaySessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Clock3 size={32} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Belum Ada Data</Text>
              <Text style={styles.emptySubtitle}>Tap Masuk Untuk Memulai</Text>
            </View>
          ) : (
            <SessionRow date={todayKey} sessions={todaySessions} />
          )}
        </View>
      </ScrollView>

      <AttendancePopup
        visible={popup !== null}
        type={popup ?? 'MASUK'}
        onConfirm={handleConfirm}
        onCancel={() => setPopup(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  content: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
  },

  clockText: { fontWeight: '600', color: '#64748B' },

  dateCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  dayName: { color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6, fontSize: 13, fontWeight: '600' },

  dateFull: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },

  actionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  gradientBtn: {
    paddingVertical: 22,
    alignItems: 'center',
    borderRadius: 16,
  },

  disabledBtn: { backgroundColor: '#E2E8F0' },

  disabledBtnContent: {
    paddingVertical: 22,
    alignItems: 'center',
  },

  btnLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 6,
  },

  btnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  disabledText: { color: '#94A3B8' },

  section: { gap: 10 },

  sectionTitle: { fontSize: 16, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#FFF',
    padding: 30,
    borderRadius: 14,
    alignItems: 'center',
  },

  emptyTitle: { marginTop: 6, color: '#94A3B8' },
  emptySubtitle: { color: '#CBD5E1', fontSize: 12 },
});