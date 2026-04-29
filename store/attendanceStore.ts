import { create } from 'zustand';
import { Session, Place } from '@/lib/database';
import {
  insertInSession,
  insertManualSession,
  updateOutSession,
  getSessionsByDate,
  getAllDates,
  getSessionsByDateRange,
  getSessionsGroupedByDate,
  getSessionsGroupedByDateRange,
  getPlaces,
  insertPlace,
  getCurrentPlaceId,
  setCurrentPlaceId,
  clearSessionsByPlace,
  updatePlaceName,
  deleteSession as deleteSessionFromDb,
  updateSession as updateSessionInDb,
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
  places: Place[];
  currentPlaceId: string;
  todaySessions: Session[];
  allGrouped: { date: string; sessions: Session[] }[];
  monthlyGrouped: { date: string; sessions: Session[] }[];
  monthlyTotalHours: number;
  loading: boolean;
  loadPlaces: () => Promise<void>;
  addPlace: (name: string) => Promise<void>;
  renamePlace: (placeId: string, name: string) => Promise<void>;
  setCurrentPlace: (placeId: string) => Promise<void>;
  clearCurrentPlaceData: () => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
  loadToday: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadMonthly: () => Promise<void>;
  checkIn: (date?: string, time?: string) => Promise<void>;
  checkOut: (date?: string, time?: string) => Promise<void>;
  updateSession: (sessionId: number, newDate: string, inTime: string, outTime: string | null, outDate?: string | null) => Promise<void>;
  insertManualSession: (date: string, inTime: string, outTime: string, outDate: string | null) => Promise<void>;
  hasOpenSession: () => boolean;
  canCheckOut: () => boolean;
  loadDemoData: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  places: [],
  currentPlaceId: 'default',
  todaySessions: [],
  allGrouped: [],
  monthlyGrouped: [],
  monthlyTotalHours: 0,
  loading: false,

  loadPlaces: async () => {
    const [places, currentPlaceId] = await Promise.all([getPlaces(), getCurrentPlaceId()]);
    const effectivePlaceId = currentPlaceId || places[0]?.id || 'default';
    set({ places, currentPlaceId: effectivePlaceId });
  },

  addPlace: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await insertPlace(trimmed);
    await get().loadPlaces();
  },

  renamePlace: async (placeId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await updatePlaceName(placeId, trimmed);
    await get().loadPlaces();
  },

  setCurrentPlace: async (placeId: string) => {
    await setCurrentPlaceId(placeId);
    set({ currentPlaceId: placeId });
    await Promise.all([
      get().loadToday(),
      get().loadAll(),
      get().loadMonthly()
    ]);
  },

  clearCurrentPlaceData: async () => {
    const { currentPlaceId } = get();
    await clearSessionsByPlace(currentPlaceId);
    await get().loadToday();
  },

  deleteSession: async (sessionId: number) => {
    await deleteSessionFromDb(sessionId);
    await Promise.all([
      get().loadToday(),
      get().loadAll(),
      get().loadMonthly()
    ]);
  },

  loadToday: async () => {
    set({ loading: true });
    try {
      const today = getTodayDate();
      const { currentPlaceId } = get();
      const sessions = await getSessionsByDate(today, currentPlaceId);
      set({ todaySessions: sessions });
    } finally {
      set({ loading: false });
    }
  },

  loadAll: async () => {
    set({ loading: true });
    try {
      const { currentPlaceId } = get();
      const all = await getSessionsGroupedByDate(currentPlaceId);
      set({ allGrouped: all });
    } finally {
      set({ loading: false });
    }
  },

  loadDemoData: async () => {
    // Generate fake demo data for testing
    const today = new Date();
    const { currentPlaceId } = get();

    // Generate last 7 days of data
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const inTime = '08:00';
      const outTime = '17:00';
      const id = await insertInSession(dateStr, inTime, currentPlaceId);
      await updateOutSession(id, outTime);
    }

    await Promise.all([
      get().loadToday(),
      get().loadAll(),
      get().loadMonthly()
    ]);
    console.log('[DemoData] Loaded successfully');
  },

  loadMonthly: async () => {
    const { startDate, endDate } = getMonthDateRange();
    const { currentPlaceId } = get();
    const grouped = await getSessionsGroupedByDateRange(startDate, endDate, currentPlaceId);
    const totalHours = calculateTotalHours(grouped);
    set({ monthlyGrouped: grouped, monthlyTotalHours: totalHours });
  },

  checkIn: async (date?: string, time?: string) => {
    try {
      await get().loadToday();
      if (get().todaySessions.some((s) => !s.out_time)) {
        throw new Error('Masih ada sesi absen terbuka. Silakan absen keluar terlebih dahulu.');
      }
      const dateToUse = date || getTodayDate();
      const timeToUse = time || getCurrentTime();
      const { currentPlaceId } = get();
      console.log('[CheckIn] Starting...', { date: dateToUse, time: timeToUse });
      const id = await insertInSession(dateToUse, timeToUse, currentPlaceId);
      console.log('[CheckIn] Success, session ID:', id);
      await Promise.all([
        get().loadToday(),
        get().loadAll(),
        get().loadMonthly()
      ]);
      console.log('[CheckIn] Data reloaded');
    } catch (error) {
      console.error('[CheckIn] Error:', error);
      throw error;
    }
  },

  checkOut: async (date?: string, time?: string) => {
    try {
      await get().loadToday();
      const { todaySessions } = get();
      const openSession = todaySessions.find((s) => !s.out_time);
      if (!openSession) {
        throw new Error('Tidak ada sesi absen terbuka untuk absen keluar.');
      }
      const timeToUse = time || getCurrentTime();
      console.log('[CheckOut] Starting...', { id: openSession.id, time: timeToUse });
      await updateOutSession(openSession.id, timeToUse);
      console.log('[CheckOut] Success');
      await Promise.all([
        get().loadToday(),
        get().loadAll(),
        get().loadMonthly()
      ]);
    } catch (error) {
      console.error('[CheckOut] Error:', error);
      throw error;
    }
  },

  updateSession: async (sessionId: number, newDate: string, inTime: string, outTime: string | null, outDate?: string | null) => {
    try {
      await updateSessionInDb(sessionId, newDate, inTime, outTime, outDate ?? null);
      await Promise.all([
        get().loadToday(),
        get().loadAll(),
        get().loadMonthly()
      ]);
    } catch (error) {
      console.error('[UpdateSession] Error:', error);
      throw error;
    }
  },

  insertManualSession: async (date: string, inTime: string, outTime: string, outDate: string | null) => {
    try {
      const placeId = get().currentPlaceId;
      await insertManualSession(date, inTime, outTime, outDate, placeId);
      await Promise.all([
        get().loadToday(),
        get().loadAll(),
        get().loadMonthly()
      ]);
    } catch (error) {
      console.error('[InsertManualSession] Error:', error);
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
