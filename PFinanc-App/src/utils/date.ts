export function formatDate(date: string | Date | null | undefined, style: 'short' | 'medium' | 'long' = 'medium'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const formats: Record<typeof style, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: 'short' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
  };

  return new Intl.DateTimeFormat('en-IN', formats[style]).format(d);
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d, 'short');
}

export function toISODateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
