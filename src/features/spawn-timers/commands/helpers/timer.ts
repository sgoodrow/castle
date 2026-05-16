import type { Timer } from "@prisma/client";
import { prismaClient } from "../../../../index";
import { parseDuration, formatDuration } from "./duration";

/**
 * Find a timer by mob name (case-insensitive, partial match).
 * Also searches aliases. Returns [allMatches, exactMatch].
 */
export async function findTimerByMob(
  mob: string,
  providedTimer?: Timer
): Promise<[Timer[], Timer | null]> {
  if (providedTimer) {
    return [[providedTimer], providedTimer];
  }

  const timers = await prismaClient.timer.findMany({
    where: {
      name: { contains: mob, mode: "insensitive" },
    },
  });

  let foundTimer =
    timers.find((t) => t.name.toLowerCase() === mob.toLowerCase()) ?? null;

  if (!foundTimer && timers.length === 1) {
    foundTimer = timers[0];
  }

  // If we can't find by name, search aliases
  if (!foundTimer) {
    const aliases = await prismaClient.alias.findMany({
      where: {
        name: { contains: mob, mode: "insensitive" },
      },
      include: { timer: true },
    });

    const exactAlias = aliases.find(
      (a) => a.name.toLowerCase() === mob.toLowerCase()
    );

    if (exactAlias) {
      return [[exactAlias.timer], exactAlias.timer];
    }
  }

  return [timers, foundTimer];
}

/**
 * Get the effective window_start for a timer, accounting for skip multiplier.
 */
export function getWindowStart(timer: Timer): string | null {
  if (!timer.windowStart) return null;
  let start = timer.windowStart;

  if ((timer.skipCount ?? 0) > 0) {
    const seconds = parseDuration(start);
    if (seconds !== null) {
      start = formatDuration(seconds * ((timer.skipCount ?? 0) + 1));
    }
  }

  return start;
}

/**
 * Get the effective window_end for a timer, accounting for skip multiplier.
 */
export function getWindowEnd(timer: Timer): string | null {
  if (!timer.windowEnd) return null;
  let end = timer.windowEnd;

  if ((timer.skipCount ?? 0) > 0) {
    const seconds = parseDuration(end);
    if (seconds !== null) {
      end = formatDuration(seconds * ((timer.skipCount ?? 0) + 1));
    }
  }

  return end;
}

/**
 * Get the effective variance for a timer, accounting for skip multiplier.
 */
export function getVariance(timer: Timer): string | null {
  if (!timer.variance) return null;
  let variance = timer.variance;

  if ((timer.skipCount ?? 0) > 0) {
    const seconds = parseDuration(variance);
    if (seconds !== null) {
      variance = formatDuration(seconds * ((timer.skipCount ?? 0) + 1));
    }
  }

  return variance;
}

/**
 * Check if a timer has a window (window_end or variance).
 */
export function hasWindow(timer: Timer): boolean {
  return (
    (timer.windowEnd ?? "").length > 0 || (timer.variance ?? "").length > 0
  );
}

/**
 * Calculate the display window duration string.
 * Returns the total window duration formatted as a string.
 */
export function displayWindow(
  timer: Timer,
  format: "short" | "long" = "short"
): string | null {
  const windowStart = getWindowStart(timer);
  const windowEnd = getWindowEnd(timer);
  const variance = getVariance(timer);

  const parsedVariance = variance ? parseDuration(variance) ?? 0 : 0;

  let duration: number | null = null;

  if (windowEnd && parsedVariance) {
    const ws = parseDuration(windowStart!) ?? 0;
    const we = parseDuration(windowEnd) ?? 0;
    duration = we + parsedVariance - (ws - parsedVariance);
  } else if (windowEnd) {
    const ws = parseDuration(windowStart!) ?? 0;
    const we = parseDuration(windowEnd) ?? 0;
    duration = we - ws;
  } else if (parsedVariance) {
    const ws = parseDuration(windowStart!) ?? 0;
    duration = ws + parsedVariance - (ws - parsedVariance);
  }

  if (duration !== null) {
    return formatDuration(duration, format);
  }

  return null;
}

/**
 * Calculate the next spawn window start time.
 */
export function nextSpawnTimeStart(
  timer: Timer,
  lastTodOverride?: number
): Date | null {
  const todValue = lastTodOverride ?? timer.lastTod;
  if (!todValue) return null;

  const tod = new Date(todValue * 1000);
  const windowStart = getWindowStart(timer);
  const variance = getVariance(timer);

  if (!windowStart) return tod;

  const windowStartSeconds = parseDuration(windowStart) ?? 0;
  const varianceSeconds = variance ? parseDuration(variance) ?? 0 : 0;

  if (varianceSeconds > 0) {
    return new Date(
      tod.getTime() + (windowStartSeconds - varianceSeconds) * 1000
    );
  }

  return new Date(tod.getTime() + windowStartSeconds * 1000);
}

/**
 * Calculate the next spawn window end time.
 */
export function nextSpawnTimeEnd(
  timer: Timer,
  lastTodOverride?: number
): Date | null {
  const todValue = lastTodOverride ?? timer.lastTod;
  if (!todValue) return null;

  const tod = new Date(todValue * 1000);
  const windowStart = getWindowStart(timer);
  const windowEnd = getWindowEnd(timer);
  const variance = getVariance(timer);

  const varianceSeconds = variance ? parseDuration(variance) ?? 0 : 0;

  if (windowEnd && varianceSeconds > 0) {
    const windowEndSeconds = parseDuration(windowEnd) ?? 0;
    return new Date(
      tod.getTime() + (windowEndSeconds + varianceSeconds) * 1000
    );
  } else if (windowEnd) {
    const windowEndSeconds = parseDuration(windowEnd) ?? 0;
    return new Date(tod.getTime() + windowEndSeconds * 1000);
  } else if (varianceSeconds > 0) {
    const windowStartSeconds = parseDuration(windowStart!) ?? 0;
    return new Date(
      tod.getTime() + (windowStartSeconds + varianceSeconds) * 1000
    );
  } else {
    const windowStartSeconds = parseDuration(windowStart!) ?? 0;
    return new Date(tod.getTime() + windowStartSeconds * 1000);
  }
}

/**
 * Calculate the last possible spawn start time (going backwards from TOD).
 */
export function lastSpawnTimeStart(
  timer: Timer,
  lastTodOverride?: number
): Date | null {
  const todValue = lastTodOverride ?? timer.lastTod;
  if (!todValue) return null;

  const tod = new Date(todValue * 1000);
  const windowStart = getWindowStart(timer);
  const variance = getVariance(timer);

  if (!windowStart) return tod;

  const windowStartSeconds = parseDuration(windowStart) ?? 0;
  const varianceSeconds = variance ? parseDuration(variance) ?? 0 : 0;

  if (varianceSeconds > 0) {
    return new Date(
      tod.getTime() - (windowStartSeconds + varianceSeconds) * 1000
    );
  }

  return new Date(tod.getTime() - windowStartSeconds * 1000);
}

/**
 * Check if a timer is currently in its spawn window.
 */
export function inWindow(timer: Timer, now: Date = new Date()): boolean {
  if (pastPossibleSpawnTime(timer, now)) return false;

  const nextSpawn = nextSpawnTimeStart(timer);
  if (!nextSpawn) return false;

  return now > nextSpawn;
}

/**
 * Check if a timer is alerting soon (within warn time of window start).
 */
export function alertingSoon(timer: Timer, now: Date = new Date()): boolean {
  const nextSpawn = nextSpawnTimeStart(timer);
  if (!nextSpawn) return false;

  let warningSeconds = 60 * 60; // default 1 hour
  if (timer.warnTime && timer.warnTime.length > 0) {
    warningSeconds = parseDuration(timer.warnTime) ?? 60 * 60;
  }

  return now.getTime() >= nextSpawn.getTime() - warningSeconds * 1000;
}

/**
 * Check if we're past the possible spawn time (10 minutes after window end).
 */
export function pastPossibleSpawnTime(
  timer: Timer,
  now: Date = new Date()
): boolean {
  const nextSpawn = nextSpawnTimeEnd(timer);
  if (!nextSpawn) return false;

  return now.getTime() > nextSpawn.getTime() + 10 * 60 * 1000;
}
