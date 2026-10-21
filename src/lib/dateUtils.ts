import type { SavedWod } from '@/types/wod';

/**
 * Returns "YYYY-MM-DD" in the user's local timezone for a given ISO string.
 */
export function toLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns "YYYY-MM-DD" from a Date object.
 */
export function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date-only "YYYY-MM-DD" string (e.g. a Postgres `date` column) as a
 * local calendar date. `new Date('YYYY-MM-DD')` parses as UTC midnight and
 * renders as the previous day in negative-offset timezones (e.g. Mexico).
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Groups SavedWod[] by their local calendar date.
 * Returns Map<"YYYY-MM-DD", SavedWod[]>.
 */
export function groupWodsByDate(wods: SavedWod[]): Map<string, SavedWod[]> {
  const map = new Map<string, SavedWod[]>();
  for (const wod of wods) {
    const key = toLocalDateKey(wod.created_at);
    const existing = map.get(key) ?? [];
    existing.push(wod);
    map.set(key, existing);
  }
  return map;
}

/**
 * Returns all calendar days for a given month, including padding from
 * previous/next months to fill complete weeks (Sunday-start).
 */
export function getCalendarDays(year: number, month: number): Array<{ date: Date; isCurrentMonth: boolean }> {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Sunday-based day index: Sun=0 ... Sat=6
  const startDow = firstOfMonth.getDay();

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= lastOfMonth.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  // Next month padding to complete last week
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

/**
 * Formats as "Febrero 2026" (capitalized month, Spanish).
 */
export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month, 1);
  const formatted = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formats a date key "YYYY-MM-DD" as a full Spanish date.
 * e.g. "viernes, 6 de febrero de 2026"
 */
export function formatFullDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Spanish short day names for calendar header (Sunday-start).
 */
export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
