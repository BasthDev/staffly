import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, ArrowDownCircle, RefreshCw, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppUpdates } from '../hooks/useAppUpdates';

export default function UpdatePopup() {
  const {
    showPopup,
    isDownloading,
    minutesSinceRelease,
    error,
    applyUpdate,
    dismissPopup,
  } = useAppUpdates();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (showPopup) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 10,
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
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showPopup, fadeAnim, scaleAnim]);

  if (!showPopup) return null;

  return (
    <Modal
      transparent
      visible={showPopup}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismissPopup()}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => dismissPopup()}
            activeOpacity={0.7}
            disabled={isDownloading}
          >
            <X size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* Top Graphic Icon */}
          <LinearGradient
            colors={['#29b0f9', '#0284c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Sparkles size={32} color="#FFFFFF" strokeWidth={2.2} />
          </LinearGradient>

          {/* Release Badge */}
          <View style={styles.badge}>
            <ArrowDownCircle size={14} color="#0284C7" strokeWidth={2.5} />
            <Text style={styles.badgeText}>
              {minutesSinceRelease !== null && minutesSinceRelease >= 30
                ? `Dirilis ${minutesSinceRelease} menit lalu`
                : 'Pembaruan Tersedia'}
            </Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>Pembaruan Tersedia!</Text>
          <Text style={styles.description}>
            Versi terbaru Staffly sudah siap dipasang. Perbarui sekarang untuk performa lebih stabil dan peningkatan fitur terbaru.
          </Text>

          {/* Error message if download failed */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.primaryBtn, isDownloading && styles.btnDisabled]}
              onPress={applyUpdate}
              disabled={isDownloading}
              activeOpacity={0.85}
            >
              {isDownloading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Mengunduh...</Text>
                </View>
              ) : (
                <View style={styles.btnContentRow}>
                  <RefreshCw size={18} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.primaryBtnText}>Perbarui Sekarang</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => dismissPopup()}
              disabled={isDownloading}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Nanti Saja</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#29b0f9',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
});
