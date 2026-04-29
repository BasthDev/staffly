import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export interface Session {
  id: number;
  date: string;
  in_time: string;
  out_time: string | null;
  out_date: string | null;
  created_at: number;
  place_id: string;
}

export interface Place {
  id: string;
  name: string;
  created_at: number;
}

type DbImpl = {
  insertInSession: (date: string, inTime: string, placeId: string) => Promise<number>;
  insertManualSession: (date: string, inTime: string, outTime: string, outDate: string | null, placeId: string) => Promise<number>;
  updateOutSession: (id: number, outTime: string) => Promise<void>;
  updateSession: (id: number, newDate: string, inTime: string, outTime: string | null, outDate: string | null) => Promise<void>;
  getSessionsByDate: (date: string, placeId: string) => Promise<Session[]>;
  getAllDates: (placeId: string) => Promise<string[]>;
  getSessionsByDateRange: (startDate: string, endDate: string, placeId: string) => Promise<Session[]>;
  clearSessionsByPlace: (placeId: string) => Promise<void>;
  deleteSession: (id: number) => Promise<void>;

  getPlaces: () => Promise<Place[]>;
  insertPlace: (name: string) => Promise<string>;
  updatePlaceName: (placeId: string, name: string) => Promise<void>;
  getCurrentPlaceId: () => Promise<string>;
  setCurrentPlaceId: (placeId: string) => Promise<void>;
};

let impl: DbImpl | null = null;
let implPromise: Promise<DbImpl> | null = null;

async function getImpl(): Promise<DbImpl> {
  if (impl) return impl;
  if (implPromise) return implPromise;

  implPromise = (async () => {
    if (Platform.OS === 'web') {
      return createWebImpl();
    }
    return createNativeImpl();
  })();

  try {
    impl = await implPromise;
    return impl;
  } finally {
    implPromise = null;
  }
}

function shouldRecoverNativeDbError(error: unknown): boolean {
  if (Platform.OS === 'web') return false;
  const message = String(error);
  return (
    message.includes('NativeDatabase.prepareAsync') ||
    message.includes('NativeDatabase.constructor') ||
    message.includes('NullPointerException') ||
    message.includes('re-opened') ||
    message.includes('closed') ||
    message.includes('database is closed')
  );
}

let isRecovering = false;

async function withDbRecovery<T>(action: (db: DbImpl) => Promise<T>): Promise<T> {
  let currentImpl = await getImpl();
  try {
    return await action(currentImpl);
  } catch (error) {
    if (!shouldRecoverNativeDbError(error) || isRecovering) throw error;
    
    isRecovering = true;
    console.warn('[SQLite] Recoverable native DB error detected, re-opening database...', error);
    
    try {
      impl = null; // Clear singleton
      implPromise = null;
      
      // Artificial delay to let OS release file locks if any
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const reopenedImpl = await getImpl();
      return await action(reopenedImpl);
    } finally {
      isRecovering = false;
    }
  }
}

function createWebImpl(): DbImpl {
  const KEY = 'staffly_sessions';
  const PLACES_KEY = 'staffly_places';
  const CURRENT_PLACE_KEY = 'staffly_current_place';
  const DEFAULT_PLACE_ID = 'default';

  function load(): Session[] {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as Session[]) : [];
      // Backfill legacy data without place_id
      return parsed.map((s) => ({
        ...s,
        place_id: (s as any).place_id || DEFAULT_PLACE_ID,
      }));
    } catch {
      return [];
    }
  }

  function save(sessions: Session[]) {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  }

  function loadPlaces(): Place[] {
    try {
      const raw = localStorage.getItem(PLACES_KEY);
      const parsed = raw ? (JSON.parse(raw) as Place[]) : [];
      if (parsed.length === 0) {
        return [{ id: DEFAULT_PLACE_ID, name: 'Default', created_at: Math.floor(Date.now() / 1000) }];
      }
      return parsed;
    } catch {
      return [{ id: DEFAULT_PLACE_ID, name: 'Default', created_at: Math.floor(Date.now() / 1000) }];
    }
  }

  function savePlaces(places: Place[]) {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places));
  }

  return {
    async insertInSession(date, inTime, placeId) {
      const sessions = load();
      const id = Date.now();
      sessions.push({
        id,
        date,
        in_time: inTime,
        out_time: null,
        out_date: null,
        created_at: Math.floor(Date.now() / 1000),
        place_id: placeId || DEFAULT_PLACE_ID,
      });
      save(sessions);
      return id;
    },
    async insertManualSession(date, inTime, outTime, outDate, placeId) {
      const sessions = load();
      const id = Date.now();
      sessions.push({
        id,
        date,
        in_time: inTime,
        out_time: outTime,
        out_date: outDate,
        created_at: Math.floor(Date.now() / 1000),
        place_id: placeId || DEFAULT_PLACE_ID,
      });
      save(sessions);
      return id;
    },
    async updateOutSession(id, outTime) {
      const sessions = load();
      const s = sessions.find((x) => x.id === id);
      if (s && !s.out_time) s.out_time = outTime;
      save(sessions);
    },
    async updateSession(id, newDate, inTime, outTime, outDate) {
      const sessions = JSON.parse(localStorage.getItem('staffly_sessions') || '[]');
      const index = sessions.findIndex((s: Session) => s.id === id);
      if (index !== -1) {
        sessions[index].date = newDate;
        sessions[index].in_time = inTime;
        sessions[index].out_time = outTime;
        sessions[index].out_date = outTime ? outDate : null;
        localStorage.setItem('staffly_sessions', JSON.stringify(sessions));
      }
    },
    async getSessionsByDate(date, placeId) {
      return load()
        .filter((s) => s.date === date && s.place_id === placeId)
        .sort((a, b) => a.created_at - b.created_at);
    },
    async getAllDates(placeId) {
      const all = load();
      const dates = [...new Set(all.filter((s) => s.place_id === placeId).map((s) => s.date))];
      return dates.sort((a, b) => b.localeCompare(a));
    },
    async getSessionsByDateRange(startDate, endDate, placeId) {
      return load()
        .filter((s) => s.date >= startDate && s.date <= endDate && s.place_id === placeId)
        .sort((a, b) => a.created_at - b.created_at);
    },

    async getPlaces() {
      const places = loadPlaces();
      if (places.length === 0) {
        const fallback = [{ id: DEFAULT_PLACE_ID, name: 'Default', created_at: Math.floor(Date.now() / 1000) }];
        savePlaces(fallback);
        return fallback;
      }
      return places;
    },
    async insertPlace(name) {
      const places = loadPlaces();
      const id = String(Date.now());
      places.push({ id, name, created_at: Math.floor(Date.now() / 1000) });
      savePlaces(places);
      return id;
    },
    async getCurrentPlaceId() {
      const current = localStorage.getItem(CURRENT_PLACE_KEY);
      if (current) return current;
      localStorage.setItem(CURRENT_PLACE_KEY, DEFAULT_PLACE_ID);
      return DEFAULT_PLACE_ID;
    },
    async setCurrentPlaceId(placeId) {
      localStorage.setItem(CURRENT_PLACE_KEY, placeId);
    },
    async clearSessionsByPlace(placeId) {
      const sessions = load().filter((s) => s.place_id !== placeId);
      save(sessions);
    },
    async updatePlaceName(placeId, name) {
      const places = loadPlaces();
      const place = places.find((p) => p.id === placeId);
      if (place) {
        place.name = name;
        savePlaces(places);
      }
    },
    async deleteSession(id) {
      const sessions = load().filter((s) => s.id !== id);
      save(sessions);
    },
  };
}

async function createNativeImpl(): Promise<DbImpl> {
  console.log('[SQLite] Opening database...');
  const DEFAULT_PLACE_ID = 'default';
  
  // Add retry mechanism for Android
  let db = null;
  let retries = 3;
  let lastError = null;
  
  while (retries > 0 && !db) {
    try {
      console.log('[SQLite] Attempting to open database. SQLite object keys:', Object.keys(SQLite || {}));
      await new Promise(resolve => setTimeout(resolve, 100));
      db = await SQLite.openDatabaseAsync('staffly.db');
      console.log('[SQLite] Database opened, retries left:', retries);
    } catch (e) {
      lastError = e;
      retries--;
      console.error('[SQLite] Open error, retrying:', retries, 'left');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  if (!db) {
    console.error('[SQLite] Failed to open database after retries:', lastError);
    throw lastError;
  }
  
  // Create table with retry
  retries = 3;
  while (retries > 0) {
    try {
      // Increased delay before initialization
      await new Promise(resolve => setTimeout(resolve, 200));

      // Use execAsync for multiple schema changes
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT, 
          date TEXT NOT NULL, 
          in_time TEXT NOT NULL, 
          out_time TEXT, 
          out_date TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')), 
          place_id TEXT
        );
        CREATE TABLE IF NOT EXISTS places (
          id TEXT PRIMARY KEY NOT NULL, 
          name TEXT NOT NULL, 
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL, 
          value TEXT
        );
      `);

      // Migration: add place_id if older DB
      try {
        await db.runAsync('ALTER TABLE sessions ADD COLUMN place_id TEXT');
      } catch { /* ignore if already exists */ }

      // Migration: add out_date if older DB
      try {
        await db.runAsync('ALTER TABLE sessions ADD COLUMN out_date TEXT');
      } catch { /* ignore if already exists */ }
      
      await db.runAsync('UPDATE sessions SET place_id = ? WHERE place_id IS NULL', [DEFAULT_PLACE_ID]);
      await db.runAsync("UPDATE sessions SET created_at = strftime('%s','now') WHERE created_at IS NULL");

      // Ensure default place exists
      const existingDefault = await db.getAllAsync<{ id: string }>('SELECT id FROM places WHERE id = ?', [DEFAULT_PLACE_ID]);
      if (!existingDefault || existingDefault.length === 0) {
        await db.runAsync('INSERT INTO places (id, name, created_at) VALUES (?, ?, ?)', [
          DEFAULT_PLACE_ID,
          'Default',
          Math.floor(Date.now() / 1000),
        ]);
      }

      // Ensure current place meta exists
      const currentRows = await db.getAllAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['current_place_id']);
      if (!currentRows || currentRows.length === 0 || !currentRows[0]?.value) {
        await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['current_place_id', DEFAULT_PLACE_ID]);
      }

      console.log('[SQLite] Table created');
      break;
    } catch (e) {
      retries--;
      console.error('[SQLite] Table create error, retrying:', retries, 'left');
      if (retries === 0) throw e;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

    return {
      async insertInSession(date, inTime, placeId) {
        try {
          const result = await db.runAsync(
            'INSERT INTO sessions (date, in_time, out_date, created_at, place_id) VALUES (?, ?, NULL, ?, ?)',
            [date, inTime, Math.floor(Date.now() / 1000), placeId || DEFAULT_PLACE_ID]
          );
          console.log('[SQLite] Insert success, ID:', result.lastInsertRowId);
          return result.lastInsertRowId;
        } catch (e) {
          console.error('[SQLite] Insert error:', e);
          throw e;
        }
      },
      async insertManualSession(date, inTime, outTime, outDate, placeId) {
        try {
          const result = await db.runAsync(
            'INSERT INTO sessions (date, in_time, out_time, out_date, created_at, place_id) VALUES (?, ?, ?, ?, ?, ?)',
            [date, inTime, outTime, outDate, Math.floor(Date.now() / 1000), placeId || DEFAULT_PLACE_ID]
          );
          console.log('[SQLite] Manual insert success, ID:', result.lastInsertRowId);
          return result.lastInsertRowId;
        } catch (e) {
          console.error('[SQLite] Manual insert error:', e);
          throw e;
        }
      },
      async updateOutSession(id, outTime) {
        try {
          await db.runAsync('UPDATE sessions SET out_time = ? WHERE id = ? AND out_time IS NULL', [outTime, id]);
          console.log('[SQLite] Update success');
        } catch (e) {
          console.error('[SQLite] Update error:', e);
          throw e;
        }
      },
      async updateSession(id, newDate, inTime, outTime, outDate) {
        try {
          await db.runAsync('UPDATE sessions SET date = ?, in_time = ?, out_time = ?, out_date = ? WHERE id = ?', [newDate, inTime, outTime, outTime ? outDate : null, id]);
          console.log('[SQLite] Update session success');
        } catch (e) {
          console.error('[SQLite] Update session error:', e);
          throw e;
        }
      },
      async getSessionsByDate(date, placeId) {
        try {
          const rows = await db.getAllAsync<Session>(
            'SELECT * FROM sessions WHERE date = ? AND place_id = ? ORDER BY created_at ASC',
            [date, placeId]
          );
          return rows || [];
        } catch (e) {
          console.error('[SQLite] Get by date error:', e);
          return [];
        }
      },
      async getAllDates(placeId) {
        try {
          const rows = await db.getAllAsync<{ date: string }>(
            'SELECT DISTINCT date FROM sessions WHERE place_id = ? ORDER BY date DESC',
            [placeId]
          );
          return (rows || []).map((r) => r.date);
        } catch (e) {
          console.error('[SQLite] Get all dates error:', e);
          return [];
        }
      },
      async getSessionsByDateRange(startDate, endDate, placeId) {
        try {
          const rows = await db.getAllAsync<Session>(
            'SELECT * FROM sessions WHERE date >= ? AND date <= ? AND place_id = ? ORDER BY created_at ASC',
            [startDate, endDate, placeId]
          );
          return rows || [];
        } catch (e) {
          console.error('[SQLite] Get range error:', e);
          return [];
        }
      },

      async getPlaces() {
        try {
          const rows = await db.getAllAsync<Place>('SELECT * FROM places ORDER BY created_at ASC');
          return rows || [];
        } catch (e) {
          console.error('[SQLite] Get places error:', e);
          return [{ id: DEFAULT_PLACE_ID, name: 'Default', created_at: Math.floor(Date.now() / 1000) }];
        }
      },
      async insertPlace(name) {
        const id = String(Date.now());
        try {
          await db.runAsync('INSERT INTO places (id, name, created_at) VALUES (?, ?, ?)', [
            id,
            name,
            Math.floor(Date.now() / 1000),
          ]);
          return id;
        } catch (e) {
          console.error('[SQLite] Insert place error:', e);
          throw e;
        }
      },
      async getCurrentPlaceId() {
        try {
          const rows = await db.getAllAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['current_place_id']);
          const value = rows?.[0]?.value;
          return value || DEFAULT_PLACE_ID;
        } catch (e) {
          console.error('[SQLite] Get current place error:', e);
          return DEFAULT_PLACE_ID;
        }
      },
      async setCurrentPlaceId(placeId) {
        try {
          await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['current_place_id', placeId]);
        } catch (e) {
          console.error('[SQLite] Set current place error:', e);
          throw e;
        }
      },
      async clearSessionsByPlace(placeId) {
        try {
          await db.runAsync('DELETE FROM sessions WHERE place_id = ?', [placeId]);
        } catch (e) {
          console.error('[SQLite] Clear sessions error:', e);
          throw e;
        }
      },
      async updatePlaceName(placeId, name) {
        try {
          await db.runAsync('UPDATE places SET name = ? WHERE id = ?', [name, placeId]);
        } catch (e) {
          console.error('[SQLite] Update place name error:', e);
          throw e;
        }
      },
      async deleteSession(id) {
        try {
          await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
          console.log('[SQLite] Delete session success');
        } catch (e) {
          console.error('[SQLite] Delete session error:', e);
          throw e;
        }
      },
    };
}

export async function insertInSession(date: string, inTime: string, placeId: string): Promise<number> {
  return withDbRecovery((db) => db.insertInSession(date, inTime, placeId));
}

export async function insertManualSession(date: string, inTime: string, outTime: string, outDate: string | null, placeId: string): Promise<number> {
  return withDbRecovery((db) => db.insertManualSession(date, inTime, outTime, outDate, placeId));
}

export async function updateOutSession(id: number, outTime: string): Promise<void> {
  return withDbRecovery((db) => db.updateOutSession(id, outTime));
}

export async function getSessionsByDate(date: string, placeId: string): Promise<Session[]> {
  return withDbRecovery((db) => db.getSessionsByDate(date, placeId));
}

export async function getAllDates(placeId: string): Promise<string[]> {
  return withDbRecovery((db) => db.getAllDates(placeId));
}

export async function getSessionsByDateRange(startDate: string, endDate: string, placeId: string): Promise<Session[]> {
  return withDbRecovery((db) => db.getSessionsByDateRange(startDate, endDate, placeId));
}

export async function getSessionsGroupedByDate(placeId: string): Promise<{ date: string; sessions: Session[] }[]> {
  const dates = await getAllDates(placeId);
  const result = [];
  for (const date of dates) {
    const sessions = await getSessionsByDate(date, placeId);
    result.push({ date, sessions });
  }
  return result;
}

export async function getSessionsGroupedByDateRange(startDate: string, endDate: string, placeId: string): Promise<{ date: string; sessions: Session[] }[]> {
  const sessions = await getSessionsByDateRange(startDate, endDate, placeId);
  const grouped: { [date: string]: Session[] } = {};
  for (const s of sessions) {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  return dates.map((date) => ({ date, sessions: grouped[date] }));
}

export async function getPlaces(): Promise<Place[]> {
  return withDbRecovery((db) => db.getPlaces());
}

export async function insertPlace(name: string): Promise<string> {
  return withDbRecovery((db) => db.insertPlace(name));
}

export async function getCurrentPlaceId(): Promise<string> {
  return withDbRecovery((db) => db.getCurrentPlaceId());
}

export async function setCurrentPlaceId(placeId: string): Promise<void> {
  return withDbRecovery((db) => db.setCurrentPlaceId(placeId));
}

export async function clearSessionsByPlace(placeId: string): Promise<void> {
  return withDbRecovery((db) => db.clearSessionsByPlace(placeId));
}

export async function deleteSession(id: number): Promise<void> {
  return withDbRecovery((db) => db.deleteSession(id));
}

export async function updatePlaceName(placeId: string, name: string): Promise<void> {
  return withDbRecovery((db) => db.updatePlaceName(placeId, name));
}

export async function updateSession(id: number, newDate: string, inTime: string, outTime: string | null, outDate: string | null): Promise<void> {
  const impl = await getImpl();
  return impl.updateSession(id, newDate, inTime, outTime, outDate);
}

export async function initDatabase(): Promise<void> {
  await getImpl();
}
