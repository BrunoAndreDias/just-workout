export function toUtcDay(value: string): Date {
  const date = new Date(value);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addUtcDays(value: Date, days: number): Date {
  const nextDate = new Date(value);

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}
