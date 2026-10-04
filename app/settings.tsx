import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trash2,
  ArrowLeft,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Heart,
  Coffee,
  ExternalLink,
} from 'lucide-react-native';
import { useAttendanceStore } from '@/store/attendanceStore';
import { router } from 'expo-router';
import ConfirmationPopup from '@/components/ConfirmationPopup';
import { useAppUpdates } from '../hooks/useAppUpdates';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { currentPlaceId, places, clearCurrentPlaceData } = useAttendanceStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [checkStatusMsg, setCheckStatusMsg] = useState<string | null>(null);

  // ─── Real app version from app.json via expo-constants ───────────────────
  const appVersion =
    Constants.expoConfig?.version ??
    ((Constants as any).manifest?.version as string | undefined) ??
    '—';
  const buildNumber =
    Constants.expoConfig?.android?.versionCode ??
    ((Constants as any).manifest?.android?.versionCode as number | undefined) ??
    null;

  const { isChecking, checkForUpdates, isUpdateAvailable, lastChecked } = useAppUpdates();

  const handleManualCheckUpdates = async () => {
    setCheckStatusMsg(null);
    await checkForUpdates();
    if (isUpdateAvailable) {
      setCheckStatusMsg('Pembaruan baru tersedia!');
    } else {
      setCheckStatusMsg('Aplikasi Anda sudah versi terbaru.');
    }
  };

  const handleOpenTrakteer = async () => {
    const url = 'https://trakteer.id/basthdev';
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error('Error opening Trakteer link:', e);
    }
  };

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
                Hapus semua data masuk/keluar untuk tempat &quot;{currentPlaceName}&quot;
              </Text>
            </View>
            <Trash2 size={20} color="#DC2626" strokeWidth={2} />
          </TouchableOpacity>

          <Text style={styles.warningText}>
            ⚠️ Data yang dihapus tidak dapat dikembalikan. Pastikan Anda sudah export data jika diperlukan.
          </Text>
        </View>

        {/* In-App Updates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pembaruan Aplikasi</Text>
          <View style={styles.updateCard}>
            <View style={styles.updateCardHeader}>
              <View style={styles.updateIconContainer}>
                <Sparkles size={22} color="#0284C7" strokeWidth={2.2} />
              </View>
              <View style={styles.updateCardInfo}>
                <Text style={styles.updateCardTitle}>Staffly v{appVersion}</Text>
                <Text style={styles.updateCardSubtitle}>
                  {lastChecked
                    ? `Terakhir dicek: ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Pembaruan otomatis 30 mnt setelah rilis'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.checkUpdateBtn, isChecking && styles.disabledCard]}
              onPress={handleManualCheckUpdates}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <View style={styles.checkUpdateRow}>
                  <ActivityIndicator size="small" color="#0284C7" />
                  <Text style={styles.checkUpdateText}>Memeriksa pembaruan...</Text>
                </View>
              ) : (
                <View style={styles.checkUpdateRow}>
                  <RefreshCw size={16} color="#0284C7" strokeWidth={2.2} />
                  <Text style={styles.checkUpdateText}>Periksa Pembaruan</Text>
                </View>
              )}
            </TouchableOpacity>

            {checkStatusMsg && (
              <Text style={styles.checkUpdateStatus}>{checkStatusMsg}</Text>
            )}
          </View>
        </View>

        {/* Support Developer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dukungan</Text>
          <TouchableOpacity
            style={styles.supportCard}
            onPress={() => setShowDonateModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F43F5E', '#E11D48']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.supportIcon}
            >
              <Heart size={24} color="#FFFFFF" strokeWidth={2.2} fill="#FFFFFF" />
            </LinearGradient>
            <View style={styles.supportInfo}>
              <Text style={styles.supportTitle}>Support Developer / Donate</Text>
              <Text style={styles.supportSubtitle}>
                Dukung pengembangan Staffly via Trakteer
              </Text>
            </View>
            <ExternalLink size={20} color="#94A3B8" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Staffly v{appVersion}
            {/* {buildNumber ? ` (build ${buildNumber})` : ''} */}
            {'\n'}
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
            <Text style={styles.successSubtitle}>Data absensi untuk &quot;{currentPlaceName}&quot; telah dikosongkan.</Text>
            <TouchableOpacity
              style={styles.successCloseBtn}
              onPress={() => setShowSuccess(false)}
            >
              <Text style={styles.successCloseText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Support / Donate Modal */}
      <Modal
        visible={showDonateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDonateModal(false)}
      >
        <View style={styles.donateOverlay}>
          <View style={styles.donateCard}>
            <LinearGradient
              colors={['#F43F5E', '#E11D48']}
              style={styles.donateIconBg}
            >
              <Heart size={32} color="#FFFFFF" strokeWidth={2.5} fill="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.donateTitle}>Support Developer</Text>
            <Text style={styles.donateSubtitle}>
              Suka dengan Staffly? Dukung pengembangan aplikasi ini agar terus aktif diperbarui lewat Trakteer.
            </Text>

            <TouchableOpacity
              style={styles.donateLinkBtn}
              onPress={handleOpenTrakteer}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F43F5E', '#BE123C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.donateLinkGradient}
              >
                <Coffee size={18} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.donateLinkText}>Traktir di Trakteer</Text>
                <ExternalLink size={16} color="#FFFFFF" strokeWidth={2.2} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.donateUrlContainer}
              onPress={handleOpenTrakteer}
              activeOpacity={0.7}
            >
              <Text style={styles.donateUrlText}>https://trakteer.id/basthdev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.donateCloseBtn}
              onPress={() => setShowDonateModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.donateCloseText}>Nanti Saja</Text>
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
  updateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  updateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  updateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateCardInfo: {
    flex: 1,
  },
  updateCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  updateCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 12,
  },
  checkUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkUpdateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  checkUpdateStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportInfo: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  supportSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  donateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  donateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    padding: 24,
    alignItems: 'center',
  },
  donateIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  donateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  donateSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  donateLinkBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  donateLinkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  donateLinkText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  donateUrlContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  donateUrlText: {
    fontSize: 13,
    color: '#E11D48',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  donateCloseBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
  },
  donateCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});
