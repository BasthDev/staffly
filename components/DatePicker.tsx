import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { formatDateLong } from '@/lib/dateUtils';

interface FixedDatePickerProps {
  date: Date;
  onAdjust: (days: number) => void;
}

// Helper to abbreviate Indonesian months for small screens
function getResponsiveDate(date: Date, isSmallScreen: boolean) {
  const longDateText = formatDateLong(date); 
  
  if (!isSmallScreen) return longDateText;

  // Dictionary of long to short month names
  const monthAbbreviations: Record<string, string> = {
    'Januari': 'Jan',
    'Februari': 'Feb',
    'Maret': 'Mar',
    'April': 'Apr',
    'Mei': 'Mei',
    'Juni': 'Jun',
    'Juli': 'Jul',
    'Agustus': 'Agu',
    'September': 'Sep',
    'Oktober': 'Okt',
    'November': 'Nov',
    'Desember': 'Des'
  };

  let shortDateText = longDateText;
  
  // Replace the full month word with its 3-letter equivalent
  Object.entries(monthAbbreviations).forEach(([long, short]) => {
    shortDateText = shortDateText.replace(long, short);
  });

  return shortDateText;
}

export default function FixedDatePicker({ date, onAdjust }: FixedDatePickerProps) {
  // Get device screen dimensions dynamically
  const { width } = useWindowDimensions();
  // Typical threshold for small devices (e.g., iPhone SE/mini is 375px wide)
  const isSmallScreen = width < 390; 

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => onAdjust(-1)}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ChevronLeft size={20} color="#64748B" />
      </TouchableOpacity>

      <View style={styles.textWrapper}>
        <Text style={styles.dateText}>
          {getResponsiveDate(date, isSmallScreen)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.navBtn}
        onPress={() => onAdjust(1)}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <ChevronRight size={20} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9', 
  },
  textWrapper: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center', 
  },
});