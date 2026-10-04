import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Session } from '@/lib/database';
import { formatDateKey, formatDateLong } from '@/lib/dateUtils';
import { ArrowRight, Trash2, X, Pencil, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import VerticalTimeSlider from './VerticalTimeSlider';
import FixedDatePicker from './DatePicker';

interface SessionRowProps {
  date: string;
  sessions: Session[];
  compact?: boolean;
  isFirstInMonth?: boolean;
  onDeleteSession?: (sessionId: number) => void;
  onUpdateSession?: (
    sessionId: number,
    newDate: string,
    inTime: string,
    outTime: string | null,
    outDate?: string | null
  ) => void;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m}m`;
}

export default function SessionRow({
  date,
  sessions,
  compact = false,
  isFirstInMonth = false,
  onDeleteSession,
  onUpdateSession,
}: SessionRowProps) {
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Loading guards to prevent double-tap
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit date state
  const [editDate, setEditDate] = useState(new Date());
  const [editOutDate, setEditOutDate] = useState(new Date());

  // Edit time states
  const [editInHour, setEditInHour] = useState('00');
  const [editInMinute, setEditInMinute] = useState('00');
  const [editOutHour, setEditOutHour] = useState('00');
  const [editOutMinute, setEditOutMinute] = useState('00');
  const [editHasOut, setEditHasOut] = useState(false);

  // Animation values for Edit Modal
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (editModalVisible) {
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
  }, [editModalVisible, fadeAnim, slideAnim]);

  const handleLongPress = (session: Session) => {
    if (!onDeleteSession && !onUpdateSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSession(session);
    setActionModalVisible(true);
  };

  const adjustDate = (delta: number) => {
    const newDate = new Date(editDate);
    newDate.setDate(newDate.getDate() + delta);
    setEditDate(newDate);
  };

  const adjustOutDate = (delta: number) => {
    const newDate = new Date(editOutDate);
    newDate.setDate(newDate.getDate() + delta);
    setEditOutDate(newDate);
  };

  function dateToKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
  }

  const handleActionDelete = () => {
    setActionModalVisible(false);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    if (selectedSession && onDeleteSession) {
      setIsDeleting(true);
      try {
        await (onDeleteSession as (id: number) => Promise<void> | void)(selectedSession.id);
      } finally {
        setIsDeleting(false);
      }
    }
    setDeleteModalVisible(false);
    setSelectedSession(null);
  };

  const handleActionEdit = () => {
    if (!selectedSession) return;

    // Parse date from session
    const [y, m, d] = date.split('-').map(Number);
    setEditDate(new Date(y, m - 1, d));

    if (selectedSession.out_date) {
      const [oy, om, od] = selectedSession.out_date.split('-').map(Number);
      setEditOutDate(new Date(oy, om - 1, od));
    } else {
      setEditOutDate(new Date(y, m - 1, d));
    }

    const [inH, inM] = selectedSession.in_time.split(':');
    setEditInHour(inH || '00');
    setEditInMinute(inM || '00');

    if (selectedSession.out_time) {
      const [outH, outM] = selectedSession.out_time.split(':');
      setEditOutHour(outH || '00');
      setEditOutMinute(outM || '00');
      setEditHasOut(true);
    } else {
      setEditOutHour('00');
      setEditOutMinute('00');
      setEditHasOut(false);
    }

    setActionModalVisible(false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSession || !onUpdateSession || isSaving) return;

    const newDate = dateToKey(editDate);
    const newInTime = `${editInHour}:${editInMinute}`;
    const newOutTime = editHasOut ? `${editOutHour}:${editOutMinute}` : null;
    const newOutDate = editHasOut ? dateToKey(editOutDate) : null;

    setIsSaving(true);
    try {
      await (onUpdateSession as (...args: any[]) => Promise<void> | void)(selectedSession.id, newDate, newInTime, newOutTime, newOutDate);
    } finally {
      setIsSaving(false);
    }
    setEditModalVisible(false);
    setSelectedSession(null);
  };

  const pairs = sessions.map((s) => ({
    inTime: s.in_time,
    outTime: s.out_time,
    session: s,
  }));

  // Calculate total working hours for completed sessions
  let totalMinutes = 0;
  pairs.forEach((pair) => {
    if (pair.outTime) {
      const inMinutes = parseTime(pair.inTime);
      const outMinutes = parseTime(pair.outTime);
      // Handle cross-day sessions (e.g., in at 23:00, out at 02:00 next day)
      let duration = outMinutes - inMinutes;
      if (duration < 0) {
        duration += 24 * 60; // Add 24 hours for cross-day
      }
      totalMinutes += duration;
    }
  });

  const hasCompletedSessions = totalMinutes > 0;

  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        isFirstInMonth && { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, marginTop: 1 },
      ]}
    >
      {/* Header with Date and Total Hours */}
      <View style={styles.header}>
        <Text style={styles.date}>{formatDateKey(date)}</Text>
        {hasCompletedSessions && (
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalHoursBadge}
          >
            <Text style={styles.totalHoursText}>{formatDuration(totalMinutes)}</Text>
          </LinearGradient>
        )}
      </View>

      {/* Sessions List */}
      <View style={styles.sessionsList}>
        {pairs.map((pair, i) => (
          <TouchableOpacity
            key={i}
            style={styles.row}
            onLongPress={() => handleLongPress(pair.session)}
            activeOpacity={0.9}
            disabled={!onDeleteSession && !onUpdateSession}
          >
            {/* IN */}
            <LinearGradient
              colors={['#29b0f9', '#0ea4e999']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.inBlock}
            >
              <Text style={styles.timeLabelLight}>MASUK</Text>
              <Text style={styles.timeValueLight}>{pair.inTime}</Text>
            </LinearGradient>

            {/* Arrow */}
            <View style={styles.arrowContainer}>
              <ArrowRight size={14} color="#9CA3AF" strokeWidth={2} />
            </View>

            {/* OUT */}
            {pair.outTime ? (
              <LinearGradient
                colors={['#F43F5E', '#e11d478f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.outBlock}
              >
                <Text style={styles.timeLabelLight}>KELUAR</Text>
                <Text style={styles.timeValueLight}>{pair.outTime}</Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeBlock}
              >
                <View style={styles.activeIndicator}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeTextLight}>Sedang Aktif</Text>
                </View>
              </LinearGradient>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Popup Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={styles.actionModalContainer}>
            <LinearGradient
              colors={['#29b0f9', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionModalHeader}
            >
              <View style={styles.actionModalHeaderContent}>
                <Clock size={22} color="#FFFFFF" strokeWidth={2.5} />
                <View>
                  <Text style={styles.actionModalTitleAlt}>Opsi Absensi</Text>
                  <Text style={styles.actionModalSubtitleAlt}>{formatDateKey(date)}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setActionModalVisible(false)}
                style={styles.actionModalCloseBtn}
              >
                <X size={20} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.actionModalContent}>
              {selectedSession && (
                <View style={styles.actionModalSessionInfoAlt}>
                  <Text style={styles.actionModalTimeAlt}>
                    {selectedSession.in_time} → {selectedSession.out_time || 'Sekarang'}
                  </Text>
                </View>
              )}

              <View style={styles.actionButtonsAlt}>
                {onUpdateSession && (
                  <TouchableOpacity
                    style={[styles.actionBtnAlt, styles.editActionBtnAlt]}
                    onPress={handleActionEdit}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconBgAlt, { backgroundColor: '#E0F2FE' }]}>
                      <Pencil size={18} color="#29b0f9" strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionBtnTextAlt}>Koreksi Waktu</Text>
                      <Text style={styles.actionBtnSubtextAlt}>Ubah jam masuk & pulang</Text>
                    </View>
                  </TouchableOpacity>
                )}

                {onDeleteSession && (
                  <TouchableOpacity
                    style={[styles.actionBtnAlt, styles.deleteActionBtnAlt]}
                    onPress={handleActionDelete}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionIconBgAlt, { backgroundColor: '#FFF1F2' }]}>
                      <Trash2 size={18} color="#F43F5E" strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.actionBtnTextAlt, { color: '#F43F5E' }]}>Hapus Data</Text>
                      <Text style={styles.actionBtnSubtextAlt}>Hapus jam masuk & pulang</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.actionCancelBtnAlt}
                onPress={() => setActionModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCancelTextAlt}>Batalkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Time Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
        statusBarTranslucent
      >
        <Animated.View style={[styles.editModalOverlay, { opacity: fadeAnim }]}>
          <Animated.View
            style={[
              styles.editModalContentWrapper,
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
              <Text style={styles.editModalTitle}>Edit Waktu</Text>
              <Text style={styles.editModalSubtitle}>{formatDateLong(editDate)}</Text>
            </View>

            <ScrollView
              style={styles.editModalScroll}
              contentContainerStyle={styles.editModalScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.editFormGroup}>
                <Text style={styles.editFormGroupTitle}>Masuk</Text>

                <View style={styles.dateSection}>
                  <FixedDatePicker date={editDate} onAdjust={adjustDate} />
                </View>

                <View style={styles.timeSection}>
                  <VerticalTimeSlider
                    hour={editInHour}
                    minute={editInMinute}
                    onChange={(h, m) => {
                      setEditInHour(h);
                      setEditInMinute(m);
                    }}
                    accentColor="#29b0f9"
                  />
                </View>
              </View>

              <View style={styles.editFormGroup}>
                <View style={styles.timeSectionHeader}>
                  <Text style={styles.editFormGroupTitle}>Keluar</Text>
                  <TouchableOpacity
                    style={[styles.hasOutToggle, editHasOut && styles.hasOutToggleActive]}
                    onPress={() => setEditHasOut(!editHasOut)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[styles.hasOutToggleDot, editHasOut && styles.hasOutToggleDotActive]}
                    />
                  </TouchableOpacity>
                </View>

                {editHasOut && (
                  <View style={styles.dateSection}>
                    <FixedDatePicker date={editOutDate} onAdjust={adjustOutDate} />
                  </View>
                )}

                <View style={styles.timeSection}>
                  {editHasOut ? (
                    <VerticalTimeSlider
                      hour={editOutHour}
                      minute={editOutMinute}
                      onChange={(h, m) => {
                        setEditOutHour(h);
                        setEditOutMinute(m);
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
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                <Text style={styles.editModalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalConfirm, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveEdit}
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

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <LinearGradient
              colors={['#F43F5E', '#e11d48']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.deleteModalHeader}
            >
              <Trash2 size={24} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.deleteModalTitle}>Hapus Data?</Text>
            </LinearGradient>

            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalText}>
                Apakah Anda yakin ingin menghapus data absensi ini?
              </Text>
              {selectedSession && (
                <View style={styles.deleteModalDetails}>
                  <Text style={styles.deleteModalDate}>{formatDateKey(date)}</Text>
                  <Text style={styles.deleteModalTime}>
                    Masuk: {selectedSession.in_time}
                    {selectedSession.out_time
                      ? ` - Keluar: ${selectedSession.out_time}`
                      : ' (Sedang Aktif)'}
                  </Text>
                </View>
              )}

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteModalCancel}
                  onPress={() => setDeleteModalVisible(false)}
                  activeOpacity={0.85}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteModalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteModalConfirm, isDeleting && { opacity: 0.7 }]}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.85}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.deleteModalConfirmText}>Hapus</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compact: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  date: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  totalHoursBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
  },
  totalHoursText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sessionsList: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  inBlock: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  outBlock: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  activeBlock: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  timeLabelLight: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValueLight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  arrowContainer: {
    paddingHorizontal: 10,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  activeTextLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Action Modal
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  actionModalHeader: {
    padding: 20,
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionModalTitleAlt: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionModalSubtitleAlt: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  actionModalContent: {
    padding: 20,
  },
  actionModalSessionInfoAlt: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  actionModalTimeAlt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  actionButtonsAlt: {
    gap: 12,
  },
  actionBtnAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  editActionBtnAlt: {
    borderColor: '#E0F2FE',
  },
  deleteActionBtnAlt: {
    borderColor: '#FFE4E6',
  },
  actionIconBgAlt: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextAlt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionBtnSubtextAlt: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  actionCancelBtnAlt: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  actionCancelTextAlt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
  },

  // Edit Modal Styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  editModalContentWrapper: {
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
    backgroundColor: '#F0F9FF',
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
    color: '#64748B',
    fontWeight: '500',
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
  dateSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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

  // Delete Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  deleteModalHeader: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  deleteModalContent: {
    padding: 20,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteModalDetails: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  deleteModalDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  deleteModalTime: {
    fontSize: 12,
    color: '#64748B',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteModalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  deleteModalCancelText: {
    fontWeight: '800',
    color: '#475569',
  },
  deleteModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F43F5E',
  },
  deleteModalConfirmText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});