import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Clock, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react-native';
import { formatDateLong } from '@/lib/dateUtils';

interface EditTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (inDate: Date, inHour: string, inMinute: string, outDate: Date, outHour: string, outMinute: string) => void;
  title: string;
  subtitle: string;
  showOutToggle?: boolean;
  defaultHasOut?: boolean;
}

export default function EditTimeModal({
  visible,
  onClose,
  onSave,
  title,
  subtitle,
  showOutToggle = false,
  defaultHasOut = true,
}: EditTimeModalProps) {
  const [inDate, setInDate] = useState(new Date());
  const [outDate, setOutDate] = useState(new Date());
  const [inHour, setInHour] = useState('09');
  const [inMinute, setInMinute] = useState('00');
  const [outHour, setOutHour] = useState('17');
  const [outMinute, setOutMinute] = useState('00');
  const [hasOut, setHasOut] = useState(defaultHasOut);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const adjustDate = (days: number) => {
    const newDate = new Date(inDate);
    newDate.setDate(newDate.getDate() + days);
    setInDate(newDate);
  };

  const adjustOutDate = (days: number) => {
    const newDate = new Date(outDate);
    newDate.setDate(newDate.getDate() + days);
    setOutDate(newDate);
  };

  const adjustTime = (value: string, delta: number, max: number) => {
    const num = parseInt(value, 10);
    const adjusted = (num + delta + max + 1) % (max + 1);
    return String(adjusted).padStart(2, '0');
  };

  const handleSave = () => {
    onSave(inDate, inHour, inMinute, outDate, outHour, outMinute);
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [300, 0]
          }) }] }]}
        >
          <View style={styles.handle} />

          <View style={styles.editModalHeader}>
              <View style={styles.editModalIconBg}>
                <Clock size={28} color="#29b0f9" strokeWidth={2.5} />
              </View>
              <Text style={styles.editModalTitle}>{title}</Text>
              <Text style={styles.editModalSubtitle}>{subtitle}</Text>
            </View>

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
                    <Text style={styles.datePickerValue}>{formatDateLong(inDate)}</Text>
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
                      onPress={() => setInHour(adjustTime(inHour, 1, 23))}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                      onPress={() => setInHour(adjustTime(inHour, -1, 23))}
                    >
                      <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timeValueLarge}>{inHour}</Text>
                  <Text style={styles.timeSeparator}>:</Text>
                  <Text style={styles.timeValueLarge}>{inMinute}</Text>
                  <View style={styles.stackedControls}>
                    <TouchableOpacity
                      style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                      onPress={() => setInMinute(adjustTime(inMinute, 1, 59))}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                      onPress={() => setInMinute(adjustTime(inMinute, -1, 59))}
                    >
                      <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.editFormGroup}>
              {showOutToggle ? (
                <View style={styles.timeSectionHeader}>
                  <Text style={styles.editFormGroupTitle}>Keluar</Text>
                  <TouchableOpacity
                    style={[styles.hasOutToggle, hasOut && styles.hasOutToggleActive]}
                    onPress={() => setHasOut(!hasOut)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.hasOutToggleDot, hasOut && styles.hasOutToggleDotActive]} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.editFormGroupTitle}>Keluar</Text>
              )}

              {hasOut && (
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
                      <Text style={styles.datePickerValue}>{formatDateLong(outDate)}</Text>
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
              )}

              <View style={styles.timeSection}>
                {hasOut ? (
                  <View style={styles.timePicker}>
                    <View style={styles.stackedControls}>
                      <TouchableOpacity
                        style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                        onPress={() => setOutHour(adjustTime(outHour, 1, 23))}
                      >
                        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                        onPress={() => setOutHour(adjustTime(outHour, -1, 23))}
                      >
                        <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.timeValueLarge}>{outHour}</Text>
                    <Text style={styles.timeSeparator}>:</Text>
                    <Text style={styles.timeValueLarge}>{outMinute}</Text>
                    <View style={styles.stackedControls}>
                      <TouchableOpacity
                        style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                        onPress={() => setOutMinute(adjustTime(outMinute, 1, 59))}
                      >
                        <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                        onPress={() => setOutMinute(adjustTime(outMinute, -1, 59))}
                      >
                        <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noOutTimeContainer}>
                    <Text style={styles.noOutTimeText}>Belum ada waktu keluar</Text>
                    <Text style={styles.noOutTimeSubtext}>(Sesi masih aktif)</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={styles.editModalCancel}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.editModalCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editModalConfirm}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.editModalConfirmText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
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
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 20,
  },
  editModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  editModalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  editModalScroll: {
    // maxHeight: 360,
    width: '100%',
    marginTop: 16,
  },
  editModalScrollContent: {
    paddingBottom: 8,
    gap: 14,
    // paddingHorizontal: 24,
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
  timeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  hasOutToggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    padding: 3,
    alignItems: 'flex-start',
  },
  hasOutToggleActive: {
    backgroundColor: '#10B981',
    alignItems: 'flex-end',
  },
  hasOutToggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hasOutToggleDotActive: {
    backgroundColor: '#FFFFFF',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stackedControls: {
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeAdjustBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
  noOutTimeContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  noOutTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  noOutTimeSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  editDateToggleBtn: {
    padding: 6,
    borderRadius: 8,
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
  dateValueWrapper: {
    paddingHorizontal: 16,
  },
  datePickerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateDisplayValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  editModalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  editModalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  editModalConfirm: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#29b0f9',
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editModalConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
