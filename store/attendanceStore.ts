import { create } from 'zustand';
import { Session, Place } from '@/lib/database';
import {
  insertInSession,
  insertManualSession,
  updateOutSession,
  getSessionsByDate,
  getOpenSession,
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
import { calculateSessionDuration } from '@/lib/dateUtils';

export { calculateSessionDuration };

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

export function calculateTotalHours(sessions: { date: string; sessions: Session[] }[]): number {
  let totalMinutes = 0;
  for (const group of sessions) {
    for (const s of group.sessions) {
      if (s.out_time) {
        totalMinutes += calculateSessionDuration(s.in_time, s.out_time, s.date || group.date, s.out_date);
      }
    }
  }
  return totalMinutes;
}

interface AttendanceState {
  places: Place[];
  currentPlaceId: string;
  todaySessions: Session[];
  activeSession: Session | null;
  allGrouped: { date: string; sessions: Session[] }[];
  monthlyGrouped: { date: string; sessions: Session[] }[];
  monthlyTotalHours: number;
  loading: boolean;
  /** True once the first full data load has completed — use to suppress blank-screen flicker */
  isInitialized: boolean;
  loadPlaces: () => Promise<void>;
  addPlace: (name: string) => Promise<void>;
  renamePlace: (placeId: string, name: string) => Promise<void>;
  setCurrentPlace: (placeId: string) => Promise<void>;
  clearCurrentPlaceData: () => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
  loadToday: () => Promise<void>;
  loadAll: () => Promise<void>;
  loadMonthly: () => Promise<void>;
  /** Loads places + today + all + monthly in a single batch (one loading cycle). Use on mount. */
  loadInitial: () => Promise<void>;
  /** Reloads all session data (today + all + monthly) in one batch after a mutation. */
  reloadAll: () => Promise<void>;
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
  activeSession: null,
  allGrouped: [],
  monthlyGrouped: [],
  monthlyTotalHours: 0,
  loading: false,
  isInitialized: false,

  // ─── Single-batch initial load ────────────────────────────────────────────
  loadInitial: async () => {
    set({ loading: true });
    try {
      const [places, currentPlaceId] = await Promise.all([getPlaces(), getCurrentPlaceId()]);
      const effectivePlaceId = currentPlaceId || places[0]?.id || 'default';

      const today = getTodayDate();
      const { startDate, endDate } = getMonthDateRange();

      const [allToday, allGrouped, monthlyGrouped, openSession] = await Promise.all([
        getSessionsByDate(today, effectivePlaceId),
        getSessionsGroupedByDate(effectivePlaceId),
        getSessionsGroupedByDateRange(startDate, endDate, effectivePlaceId),
        getOpenSession(effectivePlaceId),
      ]);

      const monthlyTotalHours = calculateTotalHours(monthlyGrouped);

      // On index screen: only show sessions that started TODAY and ended TODAY (or active today)
      // Sessions that started yesterday and ended today at midnight are NOT shown on index screen
      const todaySessions = allToday.filter((s) => {
        if (!s.out_time) return true; // active today
        if (!s.out_date) return true; // same day
        return s.out_date === today; // out date is also today
      });

      set({
        places,
        currentPlaceId: effectivePlaceId,
        todaySessions,
        activeSession: openSession,
        allGrouped,
        monthlyGrouped,
        monthlyTotalHours,
        isInitialized: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  // ─── Batch reload after any mutation ──────────────────────────────────────
  reloadAll: async () => {
    const { currentPlaceId } = get();
    const today = getTodayDate();
    const { startDate, endDate } = getMonthDateRange();

    const [allToday, allGrouped, monthlyGrouped, openSession] = await Promise.all([
      getSessionsByDate(today, currentPlaceId),
      getSessionsGroupedByDate(currentPlaceId),
      getSessionsGroupedByDateRange(startDate, endDate, currentPlaceId),
      getOpenSession(currentPlaceId),
    ]);

    const monthlyTotalHours = calculateTotalHours(monthlyGrouped);

    // Filter index screen sessions
    const todaySessions = allToday.filter((s) => {
      if (!s.out_time) return true;
      if (!s.out_date) return true;
      return s.out_date === today;
    });

    set({
      todaySessions,
      activeSession: openSession,
      allGrouped,
      monthlyGrouped,
      monthlyTotalHours,
    });
  },

  // ─── Individual loaders (kept for legacy useFocusEffect calls) ────────────
  loadPlaces: async () => {
    const [places, currentPlaceId] = await Promise.all([getPlaces(), getCurrentPlaceId()]);
    const effectivePlaceId = currentPlaceId || places[0]?.id || 'default';
    set({ places, currentPlaceId: effectivePlaceId });
  },

  loadToday: async () => {
    const today = getTodayDate();
    const { currentPlaceId } = get();
    const [allToday, openSession] = await Promise.all([
      getSessionsByDate(today, currentPlaceId),
      getOpenSession(currentPlaceId),
    ]);
    const todaySessions = allToday.filter((s) => {
      if (!s.out_time) return true;
      if (!s.out_date) return true;
      return s.out_date === today;
    });
    set({ todaySessions, activeSession: openSession });
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

  loadMonthly: async () => {
    const { startDate, endDate } = getMonthDateRange();
    const { currentPlaceId } = get();
    const grouped = await getSessionsGroupedByDateRange(startDate, endDate, currentPlaceId);
    const totalHours = calculateTotalHours(grouped);
    set({ monthlyGrouped: grouped, monthlyTotalHours: totalHours });
  },

  // ─── Place management ─────────────────────────────────────────────────────
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
    await get().reloadAll();
  },

  clearCurrentPlaceData: async () => {
    const { currentPlaceId } = get();
    await clearSessionsByPlace(currentPlaceId);
    await get().reloadAll();
  },

  deleteSession: async (sessionId: number) => {
    await deleteSessionFromDb(sessionId);
    await get().reloadAll();
  },

  // ─── Check-in / Check-out ─────────────────────────────────────────────────
  checkIn: async (date?: string, time?: string) => {
    const today = getTodayDate();
    const { currentPlaceId } = get();

    // Check if there is any open session in this place (even from yesterday)
    const openSession = await getOpenSession(currentPlaceId);
    if (openSession) {
      throw new Error('Masih ada sesi absen terbuka. Silakan absen keluar terlebih dahulu.');
    }

    const dateToUse = date || today;
    const timeToUse = time || getCurrentTime();
    console.log('[CheckIn] Starting...', { date: dateToUse, time: timeToUse });
    const id = await insertInSession(dateToUse, timeToUse, currentPlaceId);
    console.log('[CheckIn] Success, session ID:', id);
    await get().reloadAll();
    console.log('[CheckIn] Data reloaded');
  },

  checkOut: async (date?: string, time?: string) => {
    const today = getTodayDate();
    const { currentPlaceId } = get();

    // Find any open session in this place across any date
    const openSession = await getOpenSession(currentPlaceId);
    if (!openSession) {
      throw new Error('Tidak ada sesi absen terbuka untuk absen keluar.');
    }

    const timeToUse = time || getCurrentTime();
    const outDateToUse = date || today;
    console.log('[CheckOut] Starting...', { id: openSession.id, time: timeToUse, outDate: outDateToUse });
    await updateOutSession(openSession.id, timeToUse, outDateToUse);
    console.log('[CheckOut] Success');
    await get().reloadAll();
  },

  updateSession: async (sessionId: number, newDate: string, inTime: string, outTime: string | null, outDate?: string | null) => {
    await updateSessionInDb(sessionId, newDate, inTime, outTime, outDate ?? null);
    await get().reloadAll();
  },

  insertManualSession: async (date: string, inTime: string, outTime: string, outDate: string | null) => {
    const placeId = get().currentPlaceId;
    await insertManualSession(date, inTime, outTime, outDate, placeId);
    await get().reloadAll();
  },

  // ─── Computed helpers ─────────────────────────────────────────────────────
  hasOpenSession: () => {
    const { activeSession, todaySessions } = get();
    return activeSession !== null || todaySessions.some((s) => !s.out_time);
  },

  canCheckOut: () => {
    const { activeSession, todaySessions } = get();
    return activeSession !== null || todaySessions.some((s) => !s.out_time);
  },

  // ─── Demo data ────────────────────────────────────────────────────────────
  loadDemoData: async () => {
    const today = new Date();
    const { currentPlaceId } = get();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const id = await insertInSession(dateStr, '08:00', currentPlaceId);
      await updateOutSession(id, '17:00', dateStr);
    }

    await get().reloadAll();
    console.log('[DemoData] Loaded successfully');
  },
}));
