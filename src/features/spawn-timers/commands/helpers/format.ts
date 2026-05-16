import { TZ } from "../../../../config";

/**
 * Format a date for display in the configured timezone.
 * e.g. "Thursday, May 27 at 01:57:00 AM EDT"
 */
export function formatDateFull(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: TZ,
    timeZoneName: "short",
  });
}

/**
 * Format a date in short form, e.g. "05/27 01:57:00 AM EDT"
 */
export function formatDateShort(date: Date): string {
  const month = String(date.toLocaleString("en-US", { month: "2-digit", timeZone: TZ }));
  const day = String(date.toLocaleString("en-US", { day: "2-digit", timeZone: TZ }));
  const time = date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: TZ,
    timeZoneName: "short",
  });
  return `${month}/${day} ${time}`;
}

/**
 * Format a date as a schedule-style time, e.g. "14:30 EST"
 */
export function formatScheduleTime(date: Date): string {
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
    timeZoneName: "short",
  });
}

/**
 * Format a date as "Day M/D", e.g. "Thursday 5/27"
 */
export function formatScheduleDay(date: Date): string {
  const weekday = date.toLocaleString("en-US", {
    weekday: "long",
    timeZone: TZ,
  });
  const month = date.toLocaleString("en-US", {
    month: "numeric",
    timeZone: TZ,
  });
  const day = date.toLocaleString("en-US", {
    day: "numeric",
    timeZone: TZ,
  });
  return `${weekday} ${month}/${day}`;
}

/**
 * Clean a username by replacing fullwidth characters.
 */
export function cleanUsername(username: string): string {
  return username.replace(/\uff1c/g, "<").replace(/\uff1e/g, ">");
}

/**
 * Truncate a string to a max length, adding "..." if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
