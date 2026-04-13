import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';

interface MonthFilterProps {
  visible: boolean;
  onClose: () => void;
  onSelectMonth: (year: number, month: number) => void;
  onClearFilter: () => void;
  selectedYear: number;
  selectedMonth: number;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const { width } = Dimensions.get('window');

export default function MonthFilter({
  visible,
  onClose,
  onSelectMonth,
  onClearFilter,
  selectedYear,
  selectedMonth,
}: MonthFilterProps) {
  const [displayYear, setDisplayYear] = useState(selectedYear);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const handlePrevYear = () => setDisplayYear((prev) => prev - 1);
  const handleNextYear = () => setDisplayYear((prev) => prev + 1);

  const handleSelectMonth = (monthIndex: number) => {
    onSelectMonth(displayYear, monthIndex);
    onClose();
  };

  const isCurrentMonth = (monthIndex: number) => {
    return displayYear === currentYear && monthIndex === currentMonth;
  };

  const isSelectedMonth = (monthIndex: number) => {
    return displayYear === selectedYear && monthIndex === selectedMonth;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={['#29b0f9', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Calendar size={24} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.headerTitle}>Pilih Bulan</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Year Selector */}
          <View style={styles.yearSelector}>
            <TouchableOpacity
              onPress={handlePrevYear}
              style={styles.yearArrow}
              activeOpacity={0.7}
            >
              <ChevronLeft size={28} color="#29b0f9" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.yearBadge}>
              <Text style={styles.yearText}>{displayYear}</Text>
            </View>
            <TouchableOpacity
              onPress={handleNextYear}
              style={styles.yearArrow}
              activeOpacity={0.7}
            >
              <ChevronRight size={28} color="#29b0f9" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Months Grid */}
          <View style={styles.monthsGrid}>
            {MONTHS.map((month, index) => {
              const selected = isSelectedMonth(index);
              const current = isCurrentMonth(index);

              return (
                <TouchableOpacity
                  key={month}
                  onPress={() => handleSelectMonth(index)}
                  activeOpacity={0.8}
                  style={styles.monthItem}
                >
                  {selected ? (
                    <LinearGradient
                      colors={['#29b0f9', '#10B981']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.monthItemGradient}
                    >
                      <Text style={styles.monthTextSelected}>{month}</Text>
                      {current && <View style={styles.currentIndicator} />}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.monthItemDefault, current && styles.monthItemCurrent]}>
                      <Text style={[styles.monthTextDefault, current && styles.monthTextCurrent]}>
                        {month}
                      </Text>
                      {current && <View style={styles.currentIndicatorDefault} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              <TouchableOpacity
                onPress={() => {
                  onClearFilter();
                  onClose();
                }}
                style={styles.clearButton}
                activeOpacity={0.8}
              >
                <Text style={styles.clearButtonText}>Tampilkan Semua</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSelectMonth(currentMonth)}
                style={styles.todayButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.todayButtonGradient}
                >
                  <Text style={styles.todayButtonText}>Bulan Ini</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: width - 40,
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  yearArrow: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
  },
  yearBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#29b0f9',
  },
  yearText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#29b0f9',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  monthItem: {
    width: '30%',
    aspectRatio: 1.4,
    marginBottom: 8,
  },
  monthItemGradient: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#29b0f9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  monthItemDefault: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthItemCurrent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  monthTextSelected: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthTextDefault: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  monthTextCurrent: {
    color: '#10B981',
    fontWeight: '700',
  },
  currentIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  currentIndicatorDefault: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  todayButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  todayButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
