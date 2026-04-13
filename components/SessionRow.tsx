import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Session } from '@/lib/database';
import { formatDateKey } from '@/lib/dateUtils';
import { ArrowRight } from 'lucide-react-native';

interface SessionRowProps {
  date: string;
  sessions: Session[];
  compact?: boolean;
  isFirstInMonth?: boolean;
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

export default function SessionRow({ date, sessions, compact = false, isFirstInMonth = false }: SessionRowProps) {
  const pairs = sessions.map((s) => ({
    inTime: s.in_time,
    outTime: s.out_time,
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
    <View style={[styles.container, compact && styles.compact, isFirstInMonth && styles.firstInMonth]}>
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
          <View key={i} style={styles.row}>
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
                  <Text style={styles.activeTextLight}>ACTIVE</Text>
                </View>
              </LinearGradient>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  firstInMonth: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    marginTop: -1,
  },

  compact: {
    padding: 12,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  date: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },

  totalHoursBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  totalHoursText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  sessionsList: {
    gap: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },

  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },

  inBlock: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  outBlock: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  activeBlock: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  timeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  timeLabelLight: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
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
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  activeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },

  activeTextLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});