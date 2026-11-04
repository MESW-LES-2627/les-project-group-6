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
