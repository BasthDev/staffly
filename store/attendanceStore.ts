import { create } from 'zustand';
import {
  Session,
  getSessionsByDate,
  insertInSession,
  updateOutSession,
  getSessionsGroupedByDate,
  getSessionsGroupedByDateRange,
} from '@/lib/database';

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getMonthDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function calculateTotalHours(sessions: { date: string; sessions: Session[] }[]): number {
  let totalMinutes = 0;
  for (const group of sessions) {
    for (const s of group.sessions) {
      if (s.out_time) {
        const inMinutes = parseTime(s.in_time);
        const outMinutes = parseTime(s.out_time);
        const duration = outMinutes - inMinutes;
        if (duration > 0) {
          totalMinutes += duration;
        }
      }
    }
  }
  return totalMinutes;
}

interface AttendanceState {
  todaySessions: Session[];
  allGrouped: { date: string; sessions: Session[] }[];
  monthlyGrouped: { date: string; sessions: Session[] }[];
  monthlyTotalHours: number;
  loading: boolean;
  loadToday: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadMonthly: () => Promise<void>;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  hasOpenSession: () => boolean;
  canCheckOut: () => boolean;
  loadDemoData: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  todaySessions: [],
  allGrouped: [],
  monthlyGrouped: [],
  monthlyTotalHours: 0,
  loading: false,

  loadToday: async () => {
    set({ loading: true });
    const today = getTodayDate();
    const sessions = await getSessionsByDate(today);
    set({ todaySessions: sessions, loading: false });
  },

  loadAll: async () => {
    const all = await getSessionsGroupedByDate();
    set({ allGrouped: all });
  },

  loadDemoData: async () => {
    // Generate fake demo data for testing
    const today = new Date();
    const sessions = [];
    
    // Generate last 7 days of data
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const inTime = '08:00';
      const outTime = '17:00';
      const id = await insertInSession(dateStr, inTime);
      await updateOutSession(id, outTime);
    }
    
    await get().loadToday();
    await get().loadAll();
    await get().loadMonthly();
    console.log('[DemoData] Loaded successfully');
  },

  loadMonthly: async () => {
    const { startDate, endDate } = getMonthDateRange();
    const grouped = await getSessionsGroupedByDateRange(startDate, endDate);
    const totalHours = calculateTotalHours(grouped);
    set({ monthlyGrouped: grouped, monthlyTotalHours: totalHours });
  },

  checkIn: async () => {
    try {
      const today = getTodayDate();
      const time = getCurrentTime();
      console.log('[CheckIn] Starting...', { today, time });
      const id = await insertInSession(today, time);
      console.log('[CheckIn] Success, session ID:', id);
      await get().loadToday();
      await get().loadAll();
      await get().loadMonthly();
      console.log('[CheckIn] Data reloaded');
    } catch (error) {
      console.error('[CheckIn] Error:', error);
      throw error;
    }
  },

  checkOut: async () => {
    try {
      const { todaySessions } = get();
      const openSession = todaySessions.find((s) => !s.out_time);
      if (!openSession) {
        console.log('[CheckOut] No open session found');
        return;
      }
      const time = getCurrentTime();
      console.log('[CheckOut] Starting...', { sessionId: openSession.id, time });
      await updateOutSession(openSession.id, time);
      console.log('[CheckOut] Success');
      await get().loadToday();
      await get().loadAll();
      await get().loadMonthly();
      console.log('[CheckOut] Data reloaded');
    } catch (error) {
      console.error('[CheckOut] Error:', error);
      throw error;
    }
  },

  hasOpenSession: () => {
    const { todaySessions } = get();
    return todaySessions.some((s) => !s.out_time);
  },

  canCheckOut: () => {
    const { todaySessions } = get();
    return todaySessions.some((s) => !s.out_time);
  },
}));
