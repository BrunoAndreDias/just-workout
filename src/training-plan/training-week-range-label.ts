const trainingWeekMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

/**
 * Formats an inclusive UTC Training Week date range like "Jun 7-13, 2026".
 */
export function formatTrainingWeekRangeLabel(start: Date, end: Date): string {
  const startMonth = formatTrainingWeekMonth(start);
  const endMonth = formatTrainingWeekMonth(end);
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${endYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay}-${endMonth} ${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear}-${endMonth} ${endDay}, ${endYear}`;
}

function formatTrainingWeekMonth(value: Date): string {
  return trainingWeekMonthFormatter.format(value);
}
