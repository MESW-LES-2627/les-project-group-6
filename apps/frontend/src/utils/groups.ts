import { parseIsoDate } from '@/utils/date';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The last day of a period that starts on `startIso` and lasts `days` days. */
export function endDate(startIso: string, days: number): string {
  const date = parseIsoDate(startIso);
  date.setDate(date.getDate() + days - 1);
  return toIsoDate(date);
}

/** "1 November 2026" */
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "1–30 November 2026", or both months when the period crosses one */
export function formatPeriod(startIso: string, days: number): string {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endDate(startIso, days));
  const startMonth = MONTHS[start.getMonth()];
  const endMonth = MONTHS[end.getMonth()];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

/** "Maya Laurent" becomes "ML" */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}
