import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Session } from '@/lib/database';
import { formatDateKey, formatDateLong } from '@/lib/dateUtils';
import { ArrowRight, Trash2, X, Pencil, MoreVertical, Clock, Check, LogIn, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SessionRowProps {
  date: string;
  sessions: Session[];
  compact?: boolean;
  isFirstInMonth?: boolean;
  onDeleteSession?: (sessionId: number) => void;
  onUpdateSession?: (sessionId: number, inTime: string, outTime: string | null) => void;
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

export default function SessionRow({ date, sessions, compact = false, isFirstInMonth = false, onDeleteSession, onUpdateSession }: SessionRowProps) {
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Edit time states
  const [editInHour, setEditInHour] = useState('08');
  const [editInMinute, setEditInMinute] = useState('00');
  const [editOutHour, setEditOutHour] = useState('17');
  const [editOutMinute, setEditOutMinute] = useState('00');
  const [editHasOut, setEditHasOut] = useState(false);

  const handleLongPress = (session: Session) => {
    if (!onDeleteSession && !onUpdateSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSession(session);
    setActionModalVisible(true);
  };

  const handleActionDelete = () => {
    setActionModalVisible(false);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    if (selectedSession && onDeleteSession) {
      onDeleteSession(selectedSession.id);
    }
    setDeleteModalVisible(false);
    setSelectedSession(null);
  };

  const handleActionEdit = () => {
    if (!selectedSession) return;

    const [inH, inM] = selectedSession.in_time.split(':');
    setEditInHour(inH || '08');
    setEditInMinute(inM || '00');

    if (selectedSession.out_time) {
      const [outH, outM] = selectedSession.out_time.split(':');
      setEditOutHour(outH || '17');
      setEditOutMinute(outM || '00');
      setEditHasOut(true);
    } else {
      setEditOutHour('17');
      setEditOutMinute('00');
      setEditHasOut(false);
    }

    setActionModalVisible(false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!selectedSession || !onUpdateSession) return;

    const newInTime = `${editInHour.padStart(2, '0')}:${editInMinute.padStart(2, '0')}`;
    const newOutTime = editHasOut ? `${editOutHour.padStart(2, '0')}:${editOutMinute.padStart(2, '0')}` : null;

    onUpdateSession(selectedSession.id, newInTime, newOutTime);
    setEditModalVisible(false);
    setSelectedSession(null);
  };

  const adjustTime = (value: string, delta: number, max: number) => {
    const num = parseInt(value, 10) || 0;
    const newValue = num + delta;
    if (newValue < 0) return String(max).padStart(2, '0');
    if (newValue > max) return '00';
    return String(newValue).padStart(2, '0');
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
      const duration = outMinutes - inMinutes;
      if (duration > 0) {
        totalMinutes += duration;
      }
    }
  });

  const hasCompletedSessions = totalMinutes > 0;

  return (
    <View style={[
      styles.container,
      compact && styles.compact,
      isFirstInMonth && { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, marginTop: 1 }
    ]}>
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
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >

        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContentWrapper}>
            <View style={styles.editModalHeader}>
              <View style={styles.editModalIconBg}>
                <Clock size={28} color="#29b0f9" strokeWidth={2.5} />
              </View>
              <Text style={styles.editModalTitle}>Edit Waktu</Text>
              <Text style={styles.editModalSubtitle}>{formatDateLong(new Date(date))}</Text>
            </View>

            <View style={styles.timeSection}>
              <Text style={styles.timeSectionLabel}>WAKTU MASUK</Text>
              <View style={styles.timePicker}>
                <View style={styles.stackedControls}>
                  <TouchableOpacity
                    style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                    onPress={() => setEditInHour(adjustTime(editInHour, 1, 23))}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                    onPress={() => setEditInHour(adjustTime(editInHour, -1, 23))}
                  >
                    <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeValueLarge}>{editInHour}</Text>

                <Text style={styles.timeSeparator}>:</Text>

                <Text style={styles.timeValueLarge}>{editInMinute}</Text>
                <View style={styles.stackedControls}>
                  <TouchableOpacity
                    style={[styles.timeAdjustBtnSmall, styles.addBtn]}
                    onPress={() => setEditInMinute(adjustTime(editInMinute, 1, 59))}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={3} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.timeAdjustBtnSmall, styles.minusBtn]}
                    onPress={() => setEditInMinute(adjustTime(editInMinute, -1, 59))}
                  >
                    <Minus size={16} color="#FFFFFF" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.timeSection}>
              <View style={styles.timeSectionHeader}>
                <Text style={styles.timeSectionLabel}>WAKTU KELUAR</Text>
                <TouchableOpacity
                  style={[styles.hasOutToggle, editHasOut && styles.hasOutToggleActive]}
                  onPress={() => setEditHasOut(!editHasOut)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hasOutToggleDot, editHasOut && styles.hasOutToggleDotActive]} />
                </TouchableOpacity>
              </View>

              {editHasOut ? (
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
              ) : (
                <View style={styles.noOutTimeContainer}>
                  <Text style={styles.noOutTimeText}>Belum ada waktu keluar</Text>
                  <Text style={styles.noOutTimeSubtext}>(Sesi masih aktif)</Text>
                </View>
              )}
            </View>

            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.editModalCancel}
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.85}
              >
                {/* <X size={20} color="#94A3B8" /> */}
                <Text style={styles.editModalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editModalConfirm}
                onPress={handleSaveEdit}
                activeOpacity={0.85}
              >
                <Text style={styles.editModalConfirmText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                    {selectedSession.out_time ? ` - Keluar: ${selectedSession.out_time}` : ' (Sedang Aktif)'}
                  </Text>
                </View>
              )}

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.deleteModalCancel}
                  onPress={() => setDeleteModalVisible(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deleteModalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteModalConfirm}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deleteModalConfirmText}>Hapus</Text>
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
    // elevation: 2,
  },
  // No longer used, styling handled inline for stability
  compact: {
    padding: 12,
    // marginTop: -1,
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

  // Action Modal (Long Press Menu)
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

  // Edit Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContentWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  editModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editModalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  editModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  editModalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
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
    // marginBottom: 16,
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
    gap: 12,

    marginTop: 20,
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
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 3,
    // elevation: 2,
  },
  addBtn: {
    backgroundColor: '#29b0f9',
  },
  minusBtn: {
    backgroundColor: '#F43F5E',
  },
  timeValueLarge: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1E293B',
    minWidth: 65,
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
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
