// Date utilities — all dates are local-time yyyy-mm-dd strings.

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now = new Date()): string {
  return toKey(now);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** b - a in days */
export function diffDays(a: string, b: string): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime();
  return Math.round(ms / 86400000);
}

export function isWithin(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function dayName(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { weekday: 'short' });
}

export function prettyDate(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function prettyDateShort(key: string): string {
  return fromKey(key).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatClock(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** list of date keys from `from` (inclusive) to `to` (inclusive) */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard += 1;
  }
  return out;
}

/** minutes since midnight for a hh:mm string */
export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}
