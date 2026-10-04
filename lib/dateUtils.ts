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

export function calculateSessionDuration(
  inTime: string,
  outTime: string,
  inDate?: string,
  outDate?: string | null
): number {
  if (!outTime) return 0;

  // If full dates are available and different (cross-day)
  if (inDate && outDate && inDate !== outDate) {
    const [inY, inM, inD] = inDate.split('-').map(Number);
    const [inH, inMin] = inTime.split(':').map(Number);
    const [outY, outM, outD] = outDate.split('-').map(Number);
    const [outH, outMin] = outTime.split(':').map(Number);

    const start = new Date(inY, inM - 1, inD, inH, inMin).getTime();
    const end = new Date(outY, outM - 1, outD, outH, outMin).getTime();
    const diffMin = Math.round((end - start) / 60000);
    if (diffMin > 0) return diffMin;
  }

  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  let duration = (outH * 60 + outM) - (inH * 60 + inM);
  if (duration <= 0) {
    // Cross-midnight (e.g. in at 10:00, out at 00:00 = 14h, in at 10:00, out at 01:00 = 15h)
    duration += 24 * 60;
  }
  return duration;
}
