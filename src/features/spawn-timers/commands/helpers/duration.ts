/**
 * Parse a human-readable duration string into seconds.
 * Supports formats like "1 day", "2 hours", "30 minutes", "1d", "2h", "30m",
 * "18 hours", "1 week", "7 days", "10 minutes", etc.
 */
export function parseDuration(input: string): number | null {
  if (!input || input.trim().length === 0) return null;

  const str = input.trim().toLowerCase();

  let totalSeconds = 0;
  let matched = false;

  // Match patterns like "1 day", "2 hours", "30 minutes", "1d", "2h", etc.
  const regex =
    /(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|wks?|w|months?|mos?|years?|yrs?|y)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(str)) !== null) {
    matched = true;
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    if (
      unit.startsWith("y")
    ) {
      totalSeconds += value * 365.25 * 24 * 3600;
    } else if (
      unit.startsWith("mo")
    ) {
      totalSeconds += value * 30 * 24 * 3600;
    } else if (
      unit === "w" ||
      unit.startsWith("week") ||
      unit.startsWith("wk")
    ) {
      totalSeconds += value * 7 * 24 * 3600;
    } else if (
      unit === "d" ||
      unit.startsWith("day")
    ) {
      totalSeconds += value * 24 * 3600;
    } else if (
      unit === "h" ||
      unit.startsWith("hour") ||
      unit.startsWith("hr")
    ) {
      totalSeconds += value * 3600;
    } else if (
      unit === "m" ||
      unit.startsWith("min")
    ) {
      totalSeconds += value * 60;
    } else if (
      unit === "s" ||
      unit.startsWith("sec")
    ) {
      totalSeconds += value;
    }
  }

  if (!matched) {
    // Try parsing as plain number (assume seconds)
    const num = parseFloat(str);
    if (!isNaN(num)) return num;
    return null;
  }

  return totalSeconds;
}

/**
 * Format seconds into a human-readable short duration string.
 * e.g. 90000 -> "1d 1h", 3600 -> "1h", 7200 -> "2h"
 */
export function formatDuration(
  seconds: number,
  format: "short" | "long" = "short",
  showSecondsBelowDay = false
): string {
  if (seconds < 0) seconds = Math.abs(seconds);

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (format === "short") {
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
    if (secs > 0 && days === 0) {
      if (showSecondsBelowDay || hours === 0) {
        parts.push(`${secs}s`);
      }
    }
  } else {
    if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    if (minutes > 0)
      parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
    if (secs > 0 && days === 0 && hours === 0)
      parts.push(`${secs} ${secs === 1 ? "second" : "seconds"}`);
  }

  return parts.length > 0 ? parts.join(" ") : format === "short" ? "0s" : "0 seconds";
}

/**
 * Format a distance of time between now and a target time.
 * Returns a human-readable string like "2h 30m" or "1d 5h".
 */
export function formatTimeDistance(
  target: Date,
  now: Date = new Date(),
  showSecondsBelowDay = false
): string {
  const diffMs = Math.abs(target.getTime() - now.getTime());
  const diffSeconds = Math.floor(diffMs / 1000);
  return formatDuration(diffSeconds, "short", showSecondsBelowDay);
}

/**
 * Format how long ago a time was, e.g. "2h 30m ago"
 */
export function formatTimeAgo(time: Date, now: Date = new Date()): string {
  return formatTimeDistance(time, now) + " ago";
}

/**
 * Format a Date as a Discord Hammertime timestamp.
 * Default style is relative (R), which renders dynamically in Discord
 * e.g., "in 59 minutes" or "59 minutes ago".
 *
 * @see https://hammertime.cyou/en
 */
export function formatHammertime(date: Date, style: string = "R"): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  return `<t:${timestamp}:${style}>`;
}
