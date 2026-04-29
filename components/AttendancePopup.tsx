import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LogIn, LogOut, Clock, Calendar, CircleCheck as CheckCircle2, Edit3, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react-native';
import { formatDateLong, formatCurrentTimeSeconds } from '@/lib/dateUtils';

interface AttendancePopupProps {
  visible: boolean;
  type: 'MASUK' | 'KELUAR' | 'MANUAL';
  onConfirm: (date: string, inTime: string, outTime?: string, outDate?: string) => Promise<void> | void;
  onCancel: () => void;
  allowEdit?: boolean;
}

export default function AttendancePopup({
  visible,
  type,
  onConfirm,
  onCancel,
  allowEdit = false,
}: AttendancePopupProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [liveTime, setLiveTime] = useState(formatCurrentTimeSeconds());
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date editing state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditingDate, setIsEditingDate] = useState(false);
  
  // Time editing state
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHour, setEditHour] = useState('');
  const [editMinute, setEditMinute] = useState('');

  // Out time editing state for MANUAL mode
  const [isEditingOutTime, setIsEditingOutTime] = useState(false);
  const [editOutHour, setEditOutHour] = useState('');
  const [editOutMinute, setEditOutMinute] = useState('');

  // Out date editing state for MANUAL mode
  const [selectedOutDate, setSelectedOutDate] = useState(new Date());
  const [isEditingOutDate, setIsEditingOutDate] = useState(false);

  // Reset and animate on visibility change
  useEffect(() => {
    // Stop any running animations first
    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();

    if (visible) {
      // Reset state when opening
      setConfirmed(false);
      setLiveTime(formatCurrentTimeSeconds());
      
      // Initialize edit time with current time
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setEditHour(hours);
      setEditMinute(minutes);
      setIsEditingTime(false);

      // Initialize out time for MANUAL mode
      const outHours = String(now.getHours() + 8).padStart(2, '0');
      const outMinutes = String(now.getMinutes()).padStart(2, '0');
      setEditOutHour(outHours);
      setEditOutMinute(outMinutes);
      setIsEditingOutTime(false);

      // Initialize out date to today for MANUAL mode
      setSelectedOutDate(new Date());
      setIsEditingOutDate(false);

      // Initialize date to today
      setSelectedDate(new Date());
      setIsEditingDate(false);

      // Reset animation values before starting
      fadeAnim.setValue(0);
      slideAnim.setValue(400);

      // Start open animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Start close animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset after animation completes
        fadeAnim.setValue(0);
        slideAnim.setValue(400);
      });
    }
  }, [visible, fadeAnim, slideAnim]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setLiveTime(formatCurrentTimeSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const isIn = type === 'MASUK';
  const isManual = type === 'MANUAL';
  const accentColor = isManual ? '#10B981' : (isIn ? '#29b0f9' : '#F43F5E');
  const bgAccent = isManual ? '#ECFDF5' : (isIn ? '#ecf5fd' : '#FFF1F2');
  const today = new Date();

  const adjustTime = (value: string, delta: number, max: number) => {
    const num = parseInt(value, 10) || 0;
    const newValue = num + delta;
    if (newValue < 0) return String(max).padStart(2, '0');
    if (newValue > max) return '00';
    return String(newValue).padStart(2, '0');
  };

  const adjustDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
  };

  const adjustOutDate = (delta: number) => {
    const newDate = new Date(selectedOutDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedOutDate(newDate);
  };

  function formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const dateToUse = formatDateKey(selectedDate);
      // Always save time as HH:MM (without seconds)
      const inTimeToUse = isEditingTime ? `${editHour}:${editMinute}` : (type === 'MANUAL' ? `${editHour}:${editMinute}` : liveTime.substring(0, 5));

      if (type === 'MANUAL') {
        // For MANUAL mode, pass both in and out times and out date
        const outTimeToUse = isEditingOutTime ? `${editOutHour}:${editOutMinute}` : `${editOutHour}:${editOutMinute}`;
        const outDateToUse = formatDateKey(selectedOutDate);
        await onConfirm(dateToUse, inTimeToUse, outTimeToUse, outDateToUse);
      } else {
        // For MASUK/KELUAR mode, pass only the time
        await onConfirm(dateToUse, inTimeToUse);
      }
      setConfirmed(true);
      // Auto close after showing success for 1.5 seconds
      setTimeout(() => {
        onCancel();
      }, 1500);
    } catch (err) {
      console.error('[AttendancePopup] Confirm error:', err);
      setError('Gagal menyimpan absensi. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          >
              <View style={styles.handle} />

              <View style={[styles.iconRing, { backgroundColor: bgAccent }]}>
                {confirmed ? (
                  <CheckCircle2 size={36} color={accentColor} strokeWidth={2} />
                ) : isManual ? (
                  <Plus size={36} color={accentColor} strokeWidth={2} />
                ) : isIn ? (
                  <LogIn size={36} color={accentColor} strokeWidth={2} />
                ) : (
                  <LogOut size={36} color={accentColor} strokeWidth={2} />
                )}
              </View>

              <Text style={styles.title}>
                {confirmed ? 'DiCatat' : isManual ? 'Absen Manual' : isIn ? 'Absen Masuk' : 'Absen Keluar'}
              </Text>
              <Text style={[styles.subtitle, { color: accentColor }]}>
                {confirmed
                  ? `Berhasil Absen ${isManual ? 'MANUAL' : isIn ? 'MASUK' : 'KELUAR'}`
                  : isManual
                  ? 'Catat waktu yang terlewat!'
                  : 'Akhiri sesi anda untuk saat ini'}
              </Text>

              {type === 'MANUAL' ? (
                <ScrollView
                  style={styles.editModalScroll}
                  contentContainerStyle={styles.editModalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.editFormGroup}>
                    <Text style={styles.editFormGroupTitle}>Masuk</Text>

                    <View style={styles.dateSection}>
                      <View style={styles.datePickerContainer}>
                        <TouchableOpacity
                          style={styles.dateNavBtn}
                          onPress={() => adjustDate(-1)}
                          activeOpacity={0.7}
                        >
                          <ChevronLeft size={18} color="#64748B" />
                        </TouchableOpacity>
                        <View style={styles.dateValueWrapper}>
                          <Text style={styles.datePickerValue}>{formatDateLong(selectedDate)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.dateNavBtn}
                          onPress={() => adjustDate(1)}
                          activeOpacity={0.7}
                        >
                          <ChevronRight size={18} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.timeSection}>
                      <View style={styles.timePicker}>
                        <View style={styles.stackedControls}>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                            onPress={() => setEditHour(adjustTime(editHour, 1, 23))}
                          >
                            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                            onPress={() => setEditHour(adjustTime(editHour, -1, 23))}
                          >
                            <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timeValueLarge}>{editHour}</Text>
                        <Text style={styles.timeSeparator}>:</Text>
                        <Text style={styles.timeValueLarge}>{editMinute}</Text>
                        <View style={styles.stackedControls}>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                            onPress={() => setEditMinute(adjustTime(editMinute, 1, 59))}
                          >
                            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                            onPress={() => setEditMinute(adjustTime(editMinute, -1, 59))}
                          >
                            <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.editFormGroup}>
                    <Text style={styles.editFormGroupTitle}>Keluar</Text>

                    <View style={styles.dateSection}>
                      <View style={styles.datePickerContainer}>
                        <TouchableOpacity
                          style={styles.dateNavBtn}
                          onPress={() => adjustOutDate(-1)}
                          activeOpacity={0.7}
                        >
                          <ChevronLeft size={18} color="#64748B" />
                        </TouchableOpacity>
                        <View style={styles.dateValueWrapper}>
                          <Text style={styles.datePickerValue}>{formatDateLong(selectedOutDate)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.dateNavBtn}
                          onPress={() => adjustOutDate(1)}
                          activeOpacity={0.7}
                        >
                          <ChevronRight size={18} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.timeSection}>
                      <View style={styles.timePicker}>
                        <View style={styles.stackedControls}>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                            onPress={() => setEditOutHour(adjustTime(editOutHour, 1, 23))}
                          >
                            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                            onPress={() => setEditOutHour(adjustTime(editOutHour, -1, 23))}
                          >
                            <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timeValueLarge}>{editOutHour}</Text>
                        <Text style={styles.timeSeparator}>:</Text>
                        <Text style={styles.timeValueLarge}>{editOutMinute}</Text>
                        <View style={styles.stackedControls}>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                            onPress={() => setEditOutMinute(adjustTime(editOutMinute, 1, 59))}
                          >
                            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                            onPress={() => setEditOutMinute(adjustTime(editOutMinute, -1, 59))}
                          >
                            <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.infoCard}>
                  <View style={[styles.infoRow, isEditingDate && styles.infoRowCentered]}>
                    <Calendar size={16} color="#64748B" strokeWidth={2} />
                    {!isEditingDate && <Text style={styles.infoLabel}>Tanggal</Text>}
                    {isEditingDate ? (
                      <View style={styles.datePickerContainer}>
                        <TouchableOpacity
                          style={styles.dateNavBtn}
                          onPress={() => adjustDate(-1)}
                          activeOpacity={0.7}
                        >
                          <ChevronLeft size={18} color="#64748B" />
                        </TouchableOpacity>
                        <View style={styles.dateValueWrapper}>
                          <Text style={styles.datePickerValue}>{formatDateLong(selectedDate)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.dateNavBtn}
                          onPress={() => adjustDate(1)}
                          activeOpacity={0.7}
                        >
                          <ChevronRight size={18} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.infoValue}>{formatDateLong(selectedDate)}</Text>
                    )}
                    {isEditingDate && <View style={{ flex: 1 }} />}
                    {allowEdit && (
                      <TouchableOpacity
                        style={styles.editTimeBtn}
                        onPress={() => setIsEditingDate(!isEditingDate)}
                        activeOpacity={0.7}
                      >
                        <Edit3 size={14} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Clock size={16} color="#64748B" strokeWidth={2} />
                    {!isEditingTime && <Text style={styles.infoLabel}>Waktu</Text>}
                    {isEditingTime ? (
                      <View style={styles.timePickerContainer}>
                        <View style={styles.timePicker}>
                          <TouchableOpacity
                            style={styles.timeAdjustBtn}
                            onPress={() => setEditHour(adjustTime(editHour, 1, 23))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.timeAdjustText}>+</Text>
                          </TouchableOpacity>
                          <View style={styles.timeValueWrapper}>
                            <Text style={styles.timePickerValue}>{editHour}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.timeAdjustBtn}
                            onPress={() => setEditHour(adjustTime(editHour, -1, 23))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.timeAdjustText}>-</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timeSeparator}>:</Text>
                        <View style={styles.timePicker}>
                          <TouchableOpacity
                            style={styles.timeAdjustBtn}
                            onPress={() => setEditMinute(adjustTime(editMinute, 1, 59))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.timeAdjustText}>+</Text>
                          </TouchableOpacity>
                          <View style={styles.timeValueWrapper}>
                            <Text style={styles.timePickerValue}>{editMinute}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.timeAdjustBtn}
                            onPress={() => setEditMinute(adjustTime(editMinute, -1, 59))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.timeAdjustText}>-</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.infoValue, styles.timeValue]}>{liveTime}</Text>
                    )}
                    {isEditingTime && <View style={{ flex: 1 }} />}
                    {allowEdit && (
                      <TouchableOpacity
                        style={styles.editTimeBtn}
                        onPress={() => setIsEditingTime(!isEditingTime)}
                        activeOpacity={0.7}
                      >
                        <Edit3 size={14} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <View
                      style={[styles.typeDot, { backgroundColor: accentColor }]}
                    />
                    <Text style={styles.infoLabel}>Absen</Text>
                    <View style={[styles.typeBadge, { backgroundColor: bgAccent }]}>
                      <Text style={[styles.typeBadgeText, { color: accentColor }]}>
                        {type}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Loading Indicator */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Menyimpan...</Text>
                </View>
              )}

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Success State */}
              {confirmed && (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>Berhasil disimpan!</Text>
                </View>
              )}

              {/* Buttons - always show when not loading/confirmed so user can retry or close on error */}
              {!loading && !confirmed && (
                <>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmBtnText}>
                      {error ? 'Coba Lagi' : 'Konfirmasi Absen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>Batalkan</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  editModalScroll: {
    maxHeight: 360,
    width: '100%',
    marginTop: 16,
  },
  editModalScrollContent: {
    paddingBottom: 8,
    gap: 14,
  },
  editFormGroup: {
    gap: 10,
  },
  editFormGroupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  timeAdjustBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedControls: {
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: '#29b0f9',
  },
  minusBtn: {
    backgroundColor: '#F43F5E',
  },
  timeValueLarge: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
    minWidth: 56,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '800',
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 28,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 28,
    letterSpacing: 0.1,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    paddingVertical: 4,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    // paddingVertical: 14,
    height: 60,
    gap: 10,
  },
  infoRowCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  timeValue: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    fontSize: 15,
  },
  typeDot: {
    width: 16,
    height: 16,
    borderRadius: 24,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 24,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  successContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  successText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '700',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  timeAdjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeAdjustText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
  },
  timePickerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  editTimeBtn: {
    padding: 4,
    borderRadius: 6,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dateNavBtn: {
    padding: 6,
    borderRadius: 8,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateValueWrapper: {
    paddingHorizontal: 16,
  },
  timeValueWrapper: {
    paddingHorizontal: 8,
  },
});
