import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import VerticalTimeSlider from './VerticalTimeSlider';
import FixedDatePicker from './DatePicker'; // Import the new component

interface EditTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    inDate: Date,
    inHour: string,
    inMinute: string,
    outDate: Date,
    outHour: string,
    outMinute: string
  ) => void;
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
  const [inHour, setInHour] = useState('00');
  const [inMinute, setInMinute] = useState('00');
  const [outHour, setOutHour] = useState('00');
  const [outMinute, setOutMinute] = useState('00');
  const [hasOut, setHasOut] = useState(defaultHasOut);
  const [isSaving, setIsSaving] = useState(false);

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
  }, [visible, fadeAnim, slideAnim]);

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

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await (onSave as (...args: any[]) => Promise<void> | void)(inDate, inHour, inMinute, outDate, outHour, outMinute);
    } finally {
      setIsSaving(false);
    }
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
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0], 
                  }),
                },
              ],
            },
          ]}
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
            nestedScrollEnabled={true} 
          >
            {/* IN SECTION */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormGroupTitle}>Masuk</Text>

              <View style={styles.dateSection}>
                {/* Replaced with Fixed Component */}
                <FixedDatePicker date={inDate} onAdjust={adjustDate} />
              </View>

              <View style={styles.timeSection}>
                <VerticalTimeSlider
                  hour={inHour}
                  minute={inMinute}
                  onChange={(h, m) => {
                    setInHour(h);
                    setInMinute(m);
                  }}
                  accentColor="#29b0f9"
                />
              </View>
            </View>

            {/* OUT SECTION */}
            <View style={styles.editFormGroup}>
              {showOutToggle ? (
                <View style={styles.timeSectionHeader}>
                  <Text style={styles.editFormGroupTitle}>Keluar</Text>
                  <TouchableOpacity
                    style={[styles.hasOutToggle, hasOut && styles.hasOutToggleActive]}
                    onPress={() => setHasOut(!hasOut)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[styles.hasOutToggleDot, hasOut && styles.hasOutToggleDotActive]}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.editFormGroupTitle}>Keluar</Text>
              )}

              {hasOut && (
                <View style={styles.dateSection}>
                  {/* Replaced with Fixed Component */}
                  <FixedDatePicker date={outDate} onAdjust={adjustOutDate} />
                </View>
              )}

              <View style={styles.timeSection}>
                {hasOut ? (
                  <VerticalTimeSlider
                    hour={outHour}
                    minute={outMinute}
                    onChange={(h, m) => {
                      setOutHour(h);
                      setOutMinute(m);
                    }}
                    accentColor="#F43F5E"
                  />
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
              disabled={isSaving}
            >
              <Text style={styles.editModalCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editModalConfirm, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.editModalConfirmText}>Simpan</Text>
              )}
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
    maxHeight: '90%', 
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
    padding: 12, // Reduced slightly since the Fixed component has its own layout
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
  noOutTimeContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 4,
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