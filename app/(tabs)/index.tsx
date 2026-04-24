import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LogIn, LogOut, Clock3, MapPin, Check, Plus, X, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const {
    todaySessions,
    places,
    currentPlaceId,
    loadPlaces,
    setCurrentPlace,
    addPlace,
    renamePlace,
    loadToday,
    loadAll,
    checkIn,
    checkOut,
    canCheckOut,
    deleteSession,
    updateSession,
  } = useAttendanceStore();

  // 🔥 LOGIC
  const hasActiveSession = todaySessions.some((s) => !s.out_time);
  const inEnabled = !hasActiveSession;
  const outEnabled = canCheckOut();

  const [popup, setPopup] = useState<'MASUK' | 'KELUAR' | null>(null);
  const [liveTime, setLiveTime] = useState(formatCurrentTimeSeconds());

  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const placePickerAnim = useRef(new Animated.Value(0)).current;
  const [placeDraftName, setPlaceDraftName] = useState('');
  const [placeAdding, setPlaceAdding] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const inScale = useRef(new Animated.Value(1)).current;
  const outScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      await loadPlaces();
      await loadToday();
      await loadAll();
    })();
  }, [loadPlaces, loadToday, loadAll]);

  useEffect(() => {
    if (showPlacePicker) {
      Animated.timing(placePickerAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(placePickerAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [showPlacePicker, placePickerAnim]);

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

  async function handleConfirm(time?: string) {
    try {
      if (popup === 'MASUK') await checkIn(time);
      else if (popup === 'KELUAR') await checkOut(time);
      setPopup(null);
    } catch (err) {
      console.error('[handleConfirm] Error:', err);
      throw err; // Re-throw so AttendancePopup can show error
    }
  }

  const today = new Date();
  const todayKey = getTodayKey();
  const currentPlaceName = places.find((p) => p.id === currentPlaceId)?.name || 'Default';

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
          <View style={styles.dateCardHeader}>
            <View>
              <Text style={styles.dayName}>Hari ini</Text>
              <Text style={styles.dateFull}>{formatDateLong(today)}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtnCard}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
            >
              <Settings size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.placeBadge}
            activeOpacity={0.85}
            onPress={() => setShowPlacePicker(true)}
          >
            <MapPin size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.placeBadgeText}>{currentPlaceName}</Text>
          </TouchableOpacity>
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
            <SessionRow
              date={todayKey}
              sessions={todaySessions}
              onDeleteSession={deleteSession}
              onUpdateSession={updateSession}
            />
          )}
        </View>
      </ScrollView>

      <AttendancePopup
        visible={popup !== null}
        type={popup ?? 'MASUK'}
        onConfirm={handleConfirm}
        onCancel={() => setPopup(null)}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={showPlacePicker}
        onRequestClose={() => setShowPlacePicker(false)}
      >
        <View style={styles.placePickerOverlay}>
          <Animated.View style={[styles.placePickerContainer, { opacity: placePickerAnim }]}>
            <LinearGradient
              colors={['#29b0f9', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placePickerHeader}
            >
              <View style={styles.placePickerHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placePickerTitle}>Pilih Tempat</Text>
                  <Text style={styles.placePickerSubtitle}>Tempat aktif untuk absensi</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowPlacePicker(false);
                    setPlaceAdding(false);
                    setPlaceDraftName('');
                  }}
                  activeOpacity={0.8}
                  style={styles.placePickerClose}
                >
                  <X size={18} color="#FFFFFF" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={styles.placePickerContent}>
              {places.map((p) => {
                const active = p.id === currentPlaceId;
                const isEditing = editingPlaceId === p.id;
                return (
                  <View key={p.id} style={[styles.placeOption, active && styles.placeOptionActive]}>
                    {isEditing ? (
                      <View style={styles.editPlaceForm}>
                        <TextInput
                          value={editingName}
                          onChangeText={setEditingName}
                          placeholder="Nama tempat"
                          placeholderTextColor="#94A3B8"
                          style={styles.editPlaceInput}
                          autoFocus
                        />
                        <View style={styles.editPlaceActions}>
                          <TouchableOpacity
                            style={styles.editPlaceCancel}
                            onPress={() => {
                              setEditingPlaceId(null);
                              setEditingName('');
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.editPlaceCancelText}>Batal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.editPlaceSave}
                            onPress={async () => {
                              await renamePlace(p.id, editingName);
                              setEditingPlaceId(null);
                              setEditingName('');
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.editPlaceSaveText}>Simpan</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.placeOptionRow}
                        onPress={async () => {
                          await setCurrentPlace(p.id);
                          setShowPlacePicker(false);
                          setPlaceAdding(false);
                          setPlaceDraftName('');
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.placeOptionLeft}>
                          <LinearGradient
                            colors={active ? ['#10B981', '#059669'] : ['#29b0f9', '#0ea5e9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.placeOptionIcon}
                          >
                            <MapPin size={18} color="#FFFFFF" strokeWidth={2.2} />
                          </LinearGradient>
                          <Text style={[styles.placeOptionText, active && styles.placeOptionTextActive]}>
                            {p.name}
                          </Text>
                        </View>
                        <View style={styles.placeOptionRight}>
                          {active && <Check size={18} color="#10B981" strokeWidth={2.4} />}
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              setEditingPlaceId(p.id);
                              setEditingName(p.name);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity
                style={styles.addPlaceBtn}
                activeOpacity={0.85}
                onPress={() => setPlaceAdding(true)}
              >
                <Plus size={18} color="#0F172A" strokeWidth={2.4} />
                <Text style={styles.addPlaceBtnText}>Tambah Tempat</Text>
              </TouchableOpacity>
              {placeAdding && (
                <View style={styles.addPlaceForm}>
                  <TextInput
                    value={placeDraftName}
                    onChangeText={setPlaceDraftName}
                    placeholder="Nama tempat (contoh: Toko 2)"
                    placeholderTextColor="#94A3B8"
                    style={styles.addPlaceInput}
                  />
                  <View style={styles.addPlaceActions}>
                    <TouchableOpacity
                      style={styles.addPlaceCancel}
                      onPress={() => {
                        setPlaceAdding(false);
                        setPlaceDraftName('');
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.addPlaceCancelText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addPlaceSave}
                      onPress={async () => {
                        await addPlace(placeDraftName);
                        setPlaceDraftName('');
                        setPlaceAdding(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.addPlaceSaveText}>Simpan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

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
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  settingsBtnCard: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: { width: 40, height: 40, borderRadius: 12 },

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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  clockText: { fontWeight: '600', color: '#64748B' },

  dateCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  dayName: { color: 'rgba(255, 255, 255, 0.85)', marginBottom: 6, fontSize: 13, fontWeight: '600' },

  dateFull: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  placeBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  placeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  placePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  placePickerHeader: {
    padding: 18,
  },
  placePickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placePickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  placePickerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  placePickerClose: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  placePickerContent: {
    padding: 16,
    gap: 12,
  },
  placeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeOptionActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  placeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  placeOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeOptionTextActive: {
    color: '#065F46',
  },
  addPlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  addPlaceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  addPlaceForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  addPlaceInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontWeight: '600',
  },
  addPlaceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  addPlaceCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  addPlaceCancelText: {
    fontWeight: '800',
    color: '#475569',
  },
  addPlaceSave: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  addPlaceSaveText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },

  placeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  placeOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  editPlaceForm: {
    flex: 1,
    gap: 10,
  },
  editPlaceInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontWeight: '600',
  },
  editPlaceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editPlaceCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  editPlaceCancelText: {
    fontWeight: '800',
    color: '#475569',
  },
  editPlaceSave: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  editPlaceSaveText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },

  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 26 },

  actionBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  gradientBtn: {
    paddingVertical: 20,
    alignItems: 'center',
    borderRadius: 24,
  },

  disabledBtn: { backgroundColor: '#E2E8F0' },

  disabledBtnContent: {
    paddingVertical: 20,
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

  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },

  emptyCard: {
    backgroundColor: '#FFF',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyTitle: { marginTop: 6, color: '#94A3B8' },
  emptySubtitle: { color: '#CBD5E1', fontSize: 12 },
});