import { DayOfWeek } from '../types/discount';

export const DAYS_OF_WEEK: { id: DayOfWeek; short: string; jsDay: number }[] = [
  { id: 'Lunes', short: 'Lun', jsDay: 1 },
  { id: 'Martes', short: 'Mar', jsDay: 2 },
  { id: 'Miércoles', short: 'Mié', jsDay: 3 },
  { id: 'Jueves', short: 'Jue', jsDay: 4 },
  { id: 'Viernes', short: 'Vie', jsDay: 5 },
  { id: 'Sábado', short: 'Sáb', jsDay: 6 },
  { id: 'Domingo', short: 'Dom', jsDay: 0 },
];

export const ALL_DAYS: DayOfWeek[] = DAYS_OF_WEEK.map((d) => d.id);
export const WEEKDAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const WEEKEND: DayOfWeek[] = ['Sábado', 'Domingo'];

const ORDINALS = ['1er', '2do', '3er', '4to', '5to'];

export function dayFromDate(date: Date): DayOfWeek {
  const found = DAYS_OF_WEEK.find((d) => d.jsDay === date.getDay());
  return found ? found.id : 'Lunes';
}

export function getTodayDay(now: Date = new Date()): DayOfWeek {
  return dayFromDate(now);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Próxima ocurrencia (0 a 6 días hacia adelante) del día elegido. */
export function getDateForDay(day: DayOfWeek, now: Date = new Date()): Date {
  const target = DAYS_OF_WEEK.find((d) => d.id === day)?.jsDay ?? now.getDay();
  const diff = (target - now.getDay() + 7) % 7;
  return addDays(now, diff);
}

/** 1 = primera semana del mes (días 1-7), 2 = días 8-14, etc. */
export function weekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

export function ordinal(n: number): string {
  return ORDINALS[n - 1] ?? `${n}º`;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatShortDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
