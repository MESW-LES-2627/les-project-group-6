const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of an ISO calendar day (`2026-11-04`), or null when it is not a real date. */
export function parseIsoDay(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !ISO_DATE.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return null;
  return date;
}

/** The UTC calendar day of an instant, as `YYYY-MM-DD`. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The calendar day of an instant in the specified IANA timezone, as `YYYY-MM-DD`. */
export function isoDayInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** The previous ISO calendar day (`YYYY-MM-DD`). */
export function previousIsoDay(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().slice(0, 10);
}

/** The next ISO calendar day (`YYYY-MM-DD`). */
export function nextIsoDay(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0] ?? 2000;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}
