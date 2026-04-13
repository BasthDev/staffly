const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatDateLong(date: Date): string {
  const day = DAY_NAMES[date.getDay()];
  const d = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day}, ${d} ${month} ${year}`;
}

export function formatDateShort(date: Date): string {
  const day = DAY_NAMES[date.getDay()];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day} ${d}/${m}/${year}`;
}

export function formatDateKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = DAY_NAMES[date.getDay()];
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${day} ${dd}/${mm}/${y}`;
}

export function formatCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatCurrentTimeSeconds(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function getDayName(): string {
  return DAY_NAMES[new Date().getDay()];
}
