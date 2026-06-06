import * as chrono from "chrono-node";

const TIMEZONE_OFFSETS: Record<string, number> = {
  PST: -8,
  PDT: -7,
  MST: -7,
  MDT: -6,
  CST: -6,
  CDT: -5,
  EST: -5,
  EDT: -4,
  GMT: 0,
  UTC: 0,
};

const TZ_REGEX =
  /\b(PST|PDT|MST|MDT|CST|CDT|EST|EDT|GMT|UTC)\b/i;
const TZ_REGEX_GLOBAL =
  /\b(PST|PDT|MST|MDT|CST|CDT|EST|EDT|GMT|UTC)\b/gi;

/**
 * Parse a time string into a Date object.
 *
 * Supports:
 * - Relative times: "20 minutes ago", "-20", "3 days ago"
 * - Absolute times: "May 26 12 pm", "2021-04-30 12:00:00pm"
 * - With timezones: "10:58 pm EST", "5:43 PM GMT"
 * - Natural language: "last thursday at 9pm", "one day ago at noon"
 * - Dot notation: "10.58 PM EST" -> "10:58 PM EST"
 */
export function parseTime(
  input: string,
  referenceDate: Date = new Date()
): Date | null {
  if (!input || input.trim().length === 0) return null;

  let str = input.trim();

  // Replace dots with colons in time patterns (e.g. "10.58" -> "10:58")
  str = str.replace(/(\d{1,2})\.(\d{2})/, "$1:$2");

  // Handle shorthand "-20" meaning "20 minutes ago"
  const minutesMatch = str.match(/^-(\d{1,3})$/);
  if (minutesMatch) {
    str = `${minutesMatch[1]} minutes ago`;
  }

  // Check for explicit timezone
  const tzMatch = str.match(TZ_REGEX);
  let detectedTz: string | null = null;
  let tzOffset: number | null = null;

  if (tzMatch) {
    detectedTz = tzMatch[1].toUpperCase();
    tzOffset = TIMEZONE_OFFSETS[detectedTz] ?? null;
    // Remove all timezone abbreviations so chrono doesn't get confused
    // (e.g. notes in parentheses like "(est 1hr after quake)")
    str = str.replace(TZ_REGEX_GLOBAL, "").replace(/\s+/g, " ").trim();
  }

  // Use chrono to parse the time string
  const results = chrono.parse(str, {
    instant: referenceDate,
    timezone: tzOffset !== null ? tzOffset * 60 : undefined,
  }, { forwardDate: false });

  if (results.length === 0) return null;

  const result = results[0];

  // If no AM/PM was specified and chrono inferred one, check if we need to adjust
  // based on "past" context (chrono's forwardDate: false should handle this)
  const parsedDate = result.date();

  return parsedDate;
}


