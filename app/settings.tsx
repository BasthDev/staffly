import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, ArrowLeft, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { useAttendanceStore } from '@/store/attendanceStore';
import { router } from 'expo-router';
import ConfirmationPopup from '@/components/ConfirmationPopup';

export default function SettingsScreen() {
  const { currentPlaceId, places, clearCurrentPlaceData } = useAttendanceStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const currentPlaceName = places.find((p) => p.id === currentPlaceId)?.name || 'Default';

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearCurrentPlaceData();
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Clear data error:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Place Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tempat Aktif</Text>
          <View style={styles.placeCard}>
            <LinearGradient
              colors={['#29b0f9', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placeIcon}
            >
              <MapPin size={24} color="#FFFFFF" strokeWidth={2.2} />
            </LinearGradient>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{currentPlaceName}</Text>
              <Text style={styles.placeSubtitle}>Tempat absensi saat ini</Text>
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manajemen Data</Text>

          <TouchableOpacity
            style={[styles.dangerCard, isClearing && styles.disabledCard]}
            onPress={() => setShowConfirm(true)}
            disabled={isClearing}
            activeOpacity={0.8}
          >
            <View style={styles.dangerIconContainer}>
              <AlertTriangle size={24} color="#DC2626" strokeWidth={2.2} />
            </View>
            <View style={styles.dangerContent}>
              <Text style={styles.dangerTitle}>Hapus Data Absensi</Text>
              <Text style={styles.dangerSubtitle}>
                Hapus semua data masuk/keluar untuk tempat "{currentPlaceName}"
              </Text>
            </View>
            <Trash2 size={20} color="#DC2626" strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.warningText}>
            ⚠️ Data yang dihapus tidak dapat dikembalikan. Pastikan Anda sudah export data jika diperlukan.
          </Text>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Staffly v1.0{'\n'}
            Aplikasi Catat Absensi Manual{'\n'}{'\n'}
            Build By BasthDev 👻
          </Text>
        </View>
      </ScrollView>

      <ConfirmationPopup
        visible={showConfirm}
        title="Hapus Data?"
        message={`Ini akan menghapus SEMUA data absensi untuk tempat "${currentPlaceName}".\n\nTindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus Semua"
        onConfirm={handleClearData}
        onCancel={() => setShowConfirm(false)}
        isLoading={isClearing}
      />

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successIconBg}
            >
              <CheckCircle2 size={32} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            <Text style={styles.successTitle}>Berhasil Dihapus</Text>
            <Text style={styles.successSubtitle}>Data absensi untuk "{currentPlaceName}" telah dikosongkan.</Text>
            <TouchableOpacity
              style={styles.successCloseBtn}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.successCloseText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },

  content: {
    padding: 20,
    gap: 24,
  },

  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  placeSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },

  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disabledCard: {
    opacity: 0.6,
  },
  dangerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerContent: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 13,
    color: '#EF4444',
    lineHeight: 18,
  },

  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },

  infoSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },

  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    padding: 24,
    alignItems: 'center',
  },
  successIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successCloseBtn: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
  },
  successCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
});
