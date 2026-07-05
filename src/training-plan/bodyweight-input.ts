/** Parses a positive bodyweight input value, returning null for empty or invalid values. */
export function parsePositiveBodyweight(value: string): number | null {
  const parsedValue = Number(value);

  return parsedValue > 0 ? parsedValue : null;
}
