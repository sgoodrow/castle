import type { Timer } from "@prisma/client";

export const ENDED_RECENTLY_WINDOW_MS = 60 * 60 * 1000;

interface EndedTimer {
  endsAt: Date;
}

// Timers the alert loop reset after their window closed. The reset clears
// lastTod, so without this they'd drop off "Ended Recently" ~10 minutes after
// closing. In memory only: a restart forgets them.
const recentlyEnded = new Map<number, EndedTimer>();

export function recordEndedTimer(timerId: number, endsAt: Date): void {
  recentlyEnded.set(timerId, { endsAt });
}

/**
 * When the timer ended, if it was auto-reset within the last hour and hasn't
 * been given a new tod (or cleared/re-registered) since.
 */
export function getRecentlyEndedAt(
  timer: Timer,
  now: Date = new Date()
): Date | null {
  const entry = recentlyEnded.get(timer.id);
  if (!entry) return null;

  if (
    timer.lastTod ||
    now.getTime() - entry.endsAt.getTime() > ENDED_RECENTLY_WINDOW_MS
  ) {
    recentlyEnded.delete(timer.id);
    return null;
  }

  return entry.endsAt;
}

export function forgetEndedTimers(timerIds?: number[]): void {
  if (!timerIds) {
    recentlyEnded.clear();
    return;
  }
  for (const id of timerIds) recentlyEnded.delete(id);
}
