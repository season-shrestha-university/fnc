/**
 * Formats a calendar date without shifting it across time zones.
 * Uses UTC and an explicit locale so server and client render identical text.
 */
export default function LocalDate({
  value,
  options,
  locale = "en",
}: {
  value: string;
  options: Intl.DateTimeFormatOptions;
  locale?: string | string[];
}) {
  const datePart = value.slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return <>{value}</>;

  const text = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(parsed);
  return <>{text}</>;
}
