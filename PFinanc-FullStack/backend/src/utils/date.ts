/**
 * YYYY-MM-DD for a Date in the server's local calendar.
 * `date.toISOString().split('T')[0]` converts to UTC first, which shifts dates by a day for
 * timezones ahead of UTC (e.g. IST midnight becomes the previous day).
 */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
