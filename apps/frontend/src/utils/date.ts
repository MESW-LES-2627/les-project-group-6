/** Parses an ISO date (YYYY-MM-DD) as a local date, so the day does not shift with the timezone. */
export function parseIsoDate(iso: string): Date {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "March 2026" */
export function formatMonthYear(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** "September" */
export function formatMonth(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-GB', { month: 'long' });
}

// Fixed list: `toLocaleDateString` gives "Sept" or "Sep" depending on the ICU version
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "25 Sep" */
export function formatDayMonth(iso: string): string {
  const date = parseIsoDate(iso);
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}
