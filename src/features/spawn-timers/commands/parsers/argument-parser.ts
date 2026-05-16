/**
 * Parse command arguments to extract mob name and optional time-of-death string.
 *
 * Supports:
 * - "Faydedar" -> ["Faydedar", null]
 * - "Faydedar|10 hours ago" -> ["Faydedar", "10 hours ago"]
 * - "Faydedar, 10 hours ago" -> ["Faydedar", "10 hours ago"]
 * - "Faydedar 10 hours ago" -> ["Faydedar", "10 hours ago"]
 * - "Faydedar -20" -> ["Faydedar", "-20"]
 * - "vessel June 1, 2022 4:09 AM" -> ["vessel", "June 1, 2022 4:09 AM"]
 * - "nortlav the scalekeeper|2022-06-01 00:23:11 -0400" -> [name, time]
 */
export function parseArguments(
  args: string
): [string, string | null] {
  const input = args.trim();

  // First, try splitting by pipe only (unambiguous separator)
  const pipeSplit = input.split("|", 2);
  if (pipeSplit.length === 2 && pipeSplit[1].trim().length > 0) {
    return [
      pipeSplit[0].trim().replace(/`/g, "'"),
      pipeSplit[1].trim(),
    ];
  }

  // Try to find the boundary between mob name and time using regex patterns.
  // Look for patterns that indicate the start of a time expression.
  // This must run BEFORE comma splitting since dates like "June 1, 2022" contain commas.
  const timePatterns =
    /(\s+)(-\d{1,3})(?:\s|$)|(\s+|,\s*)(jan\w*\s|feb\w*\s|mar\w*\s|apr\w*\s|may\s|jun\w*\s|jul\w*\s|aug\w*\s|sep\w*\s|oct\w*\s|nov\w*\s|dec\w*\s|\d{4}-|\d+\s+(?:minutes?|hours?|days?|weeks?|months?|years?)\s+ago)/i;

  const match = input.match(timePatterns);

  if (match) {
    const matchIndex = match.index!;
    if (match[1]) {
      // First branch: negative number like "-20"
      const mob = input.substring(0, matchIndex).trim();
      const timeStr = input.substring(matchIndex).trim();
      if (mob.length > 0) {
        return [mob.replace(/`/g, "'"), timeStr];
      }
    } else if (match[3]) {
      // Second branch: time expression starting with month, year, or relative phrase
      const separatorLength = match[3].length;
      const mob = input.substring(0, matchIndex).trim();
      const timeStr = input.substring(matchIndex + separatorLength).trim();
      if (mob.length > 0 && timeStr.length > 0) {
        return [mob.replace(/`/g, "'"), timeStr];
      }
    }
  }

  // Try space-separated numeric time (e.g. "bob 10 am", "something 5/3 10:58 pm")
  const numericTimePattern =
    /(\s+|,\s*)(\d{1,2}[\s:\/])/;
  const numMatch = input.match(numericTimePattern);
  if (numMatch) {
    const matchIndex = numMatch.index!;
    const separatorLength = numMatch[1].length;
    const mob = input.substring(0, matchIndex).trim();
    const timeStr = input.substring(matchIndex + separatorLength).trim();
    if (mob.length > 0 && timeStr.length > 0) {
      return [mob.replace(/`/g, "'"), timeStr];
    }
  }

  // Comma split as last resort (for "bob, something" where something isn't a date)
  const commaSplit = input.split(",", 2);
  if (commaSplit.length === 2 && commaSplit[1].trim().length > 0) {
    return [
      commaSplit[0].trim().replace(/`/g, "'"),
      commaSplit[1].trim(),
    ];
  }

  // Just a mob name, no time
  return [input.replace(/`/g, "'"), null];
}
