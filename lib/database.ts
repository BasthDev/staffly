import { Platform } from 'react-native';

export interface Session {
  id: number;
  date: string;
  in_time: string;
  out_time: string | null;
  created_at: number;
}

type DbImpl = {
  insertInSession: (date: string, inTime: string) => Promise<number>;
  updateOutSession: (id: number, outTime: string) => Promise<void>;
  getSessionsByDate: (date: string) => Promise<Session[]>;
  getAllDates: () => Promise<string[]>;
  getSessionsByDateRange: (startDate: string, endDate: string) => Promise<Session[]>;
};

let impl: DbImpl | null = null;

async function getImpl(): Promise<DbImpl> {
  if (impl) return impl;

  if (Platform.OS === 'web') {
    impl = createWebImpl();
  } else {
    impl = await createNativeImpl();
  }
  return impl;
}

function createWebImpl(): DbImpl {
  const KEY = 'staffly_sessions';

  function load(): Session[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save(sessions: Session[]) {
    localStorage.setItem(KEY, JSON.stringify(sessions));
  }

  return {
    async insertInSession(date, inTime) {
      const sessions = load();
      const id = Date.now();
      sessions.push({ id, date, in_time: inTime, out_time: null, created_at: Math.floor(Date.now() / 1000) });
      save(sessions);
      return id;
    },
    async updateOutSession(id, outTime) {
      const sessions = load();
      const s = sessions.find((x) => x.id === id);
      if (s) s.out_time = outTime;
      save(sessions);
    },
    async getSessionsByDate(date) {
      return load()
        .filter((s) => s.date === date)
        .sort((a, b) => a.created_at - b.created_at);
    },
    async getAllDates() {
      const all = load();
      const dates = [...new Set(all.map((s) => s.date))];
      return dates.sort((a, b) => b.localeCompare(a));
    },
    async getSessionsByDateRange(startDate, endDate) {
      return load()
        .filter((s) => s.date >= startDate && s.date <= endDate)
        .sort((a, b) => a.created_at - b.created_at);
    },
  };
}

async function createNativeImpl(): Promise<DbImpl> {
  const SQLite = await import('expo-sqlite');
  console.log('[SQLite] Opening database...');
  
  // Add retry mechanism for Android
  let db = null;
  let retries = 3;
  let lastError = null;
  
  while (retries > 0 && !db) {
    try {
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
      await db.runAsync(
        'CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, in_time TEXT NOT NULL, out_time TEXT, created_at INTEGER)'
      );
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
      async insertInSession(date, inTime) {
        try {
          const result = await db.runAsync(
            'INSERT INTO sessions (date, in_time) VALUES (?, ?)',
            [date, inTime]
          );
          console.log('[SQLite] Insert success, ID:', result.lastInsertRowId);
          return result.lastInsertRowId;
        } catch (e) {
          console.error('[SQLite] Insert error:', e);
          throw e;
        }
      },
      async updateOutSession(id, outTime) {
        try {
          await db.runAsync('UPDATE sessions SET out_time = ? WHERE id = ?', [outTime, id]);
          console.log('[SQLite] Update success');
        } catch (e) {
          console.error('[SQLite] Update error:', e);
          throw e;
        }
      },
      async getSessionsByDate(date) {
        try {
          const rows = await db.getAllAsync<Session>(
            'SELECT * FROM sessions WHERE date = ? ORDER BY created_at ASC',
            [date]
          );
          return rows || [];
        } catch (e) {
          console.error('[SQLite] Get by date error:', e);
          return [];
        }
      },
      async getAllDates() {
        try {
          const rows = await db.getAllAsync<{ date: string }>(
            'SELECT DISTINCT date FROM sessions ORDER BY date DESC'
          );
          return (rows || []).map((r) => r.date);
        } catch (e) {
          console.error('[SQLite] Get all dates error:', e);
          return [];
        }
      },
      async getSessionsByDateRange(startDate, endDate) {
        try {
          const rows = await db.getAllAsync<Session>(
            'SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY created_at ASC',
            [startDate, endDate]
          );
          return rows || [];
        } catch (e) {
          console.error('[SQLite] Get range error:', e);
          return [];
        }
      },
    };
}

export async function insertInSession(date: string, inTime: string): Promise<number> {
  return (await getImpl()).insertInSession(date, inTime);
}

export async function updateOutSession(id: number, outTime: string): Promise<void> {
  return (await getImpl()).updateOutSession(id, outTime);
}

export async function getSessionsByDate(date: string): Promise<Session[]> {
  return (await getImpl()).getSessionsByDate(date);
}

export async function getAllDates(): Promise<string[]> {
  return (await getImpl()).getAllDates();
}

export async function getSessionsByDateRange(startDate: string, endDate: string): Promise<Session[]> {
  return (await getImpl()).getSessionsByDateRange(startDate, endDate);
}

export async function getSessionsGroupedByDate(): Promise<{ date: string; sessions: Session[] }[]> {
  const dates = await getAllDates();
  const result = [];
  for (const date of dates) {
    const sessions = await getSessionsByDate(date);
    result.push({ date, sessions });
  }
  return result;
}

export async function getSessionsGroupedByDateRange(startDate: string, endDate: string): Promise<{ date: string; sessions: Session[] }[]> {
  const sessions = await getSessionsByDateRange(startDate, endDate);
  const grouped: { [date: string]: Session[] } = {};
  for (const s of sessions) {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  return dates.map((date) => ({ date, sessions: grouped[date] }));
}

export async function initDatabase(): Promise<void> {
  await getImpl();
}
