import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { LogIn, LogOut, Clock, Calendar, CircleCheck as CheckCircle2, Edit3 } from 'lucide-react-native';
import { formatDateLong, formatCurrentTimeSeconds } from '@/lib/dateUtils';

interface AttendancePopupProps {
  visible: boolean;
  type: 'MASUK' | 'KELUAR';
  onConfirm: (time: string) => Promise<void> | void;
  onCancel: () => void;
}

export default function AttendancePopup({
  visible,
  type,
  onConfirm,
  onCancel,
}: AttendancePopupProps) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [liveTime, setLiveTime] = useState(formatCurrentTimeSeconds());
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Time editing state
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editHour, setEditHour] = useState('');
  const [editMinute, setEditMinute] = useState('');

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
  const accentColor = isIn ? '#29b0f9' : '#F43F5E';
  const bgAccent = isIn ? '#ecf5fd' : '#FFF1F2';
  const today = new Date();

  const adjustTime = (value: string, delta: number, max: number) => {
    const num = parseInt(value, 10) || 0;
    const newValue = num + delta;
    if (newValue < 0) return String(max).padStart(2, '0');
    if (newValue > max) return '00';
    return String(newValue).padStart(2, '0');
  };

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const timeToUse = isEditingTime ? `${editHour}:${editMinute}` : liveTime;
      await onConfirm(timeToUse);
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
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
              <View style={styles.handle} />

              <View style={[styles.iconRing, { backgroundColor: bgAccent }]}>
                {confirmed ? (
                  <CheckCircle2 size={36} color={accentColor} strokeWidth={2} />
                ) : isIn ? (
                  <LogIn size={36} color={accentColor} strokeWidth={2} />
                ) : (
                  <LogOut size={36} color={accentColor} strokeWidth={2} />
                )}
              </View>

              <Text style={styles.title}>
                {confirmed ? 'DiCatat' : isIn ? 'Absen Masuk' : 'Absen Keluar'}
              </Text>
              <Text style={[styles.subtitle, { color: accentColor }]}>
                {confirmed
                  ? `Berhasil Absen ${isIn ? 'MASUK' : 'KELUAR'}`
                  : isIn
                  ? 'Tandai absen kamu hari ini'
                  : 'Akhiri sesi anda untuk saat ini'}
              </Text>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Calendar size={16} color="#64748B" strokeWidth={2} />
                  <Text style={styles.infoLabel}>Tanggal</Text>
                  <Text style={styles.infoValue}>{formatDateLong(today)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Clock size={16} color="#64748B" strokeWidth={2} />
                  <Text style={styles.infoLabel}>Waktu</Text>
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
                        <Text style={styles.timePickerValue}>{editHour}</Text>
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
                        <Text style={styles.timePickerValue}>{editMinute}</Text>
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
                  <TouchableOpacity
                    style={styles.editTimeBtn}
                    onPress={() => setIsEditingTime(!isEditingTime)}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={14} color="#64748B" />
                  </TouchableOpacity>
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
                      {error ? 'Coba Lagi' : `Konfirmasi ${isIn ? 'Absen Masuk' : 'Absen Keluar'}`}
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
          </TouchableWithoutFeedback>
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
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
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
    paddingVertical: 14,
    gap: 10,
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
    justifyContent: 'center',
    gap: 8,
  },
  timePicker: {
    alignItems: 'center',
    gap: 4,
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
  timeSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  editTimeBtn: {
    padding: 4,
    borderRadius: 6,
  },
});
