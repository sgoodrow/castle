import type { Timer } from "@prisma/client";
import {
  forgetEndedTimers,
  getRecentlyEndedAt,
  recordEndedTimer,
} from "./ended-timers";

function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 1,
    name: "test",
    windowStart: "1h",
    windowEnd: null,
    variance: null,
    alerted: null,
    lastTod: null,
    alertingSoon: false,
    skipCount: 0,
    autoTod: false,
    linkedTimerId: null,
    clearParentTimerId: null,
    warnTime: null,
    ...overrides,
  };
}

const endsAt = new Date("2026-01-01T12:00:00Z");
const minutesAfter = (m: number) => new Date(endsAt.getTime() + m * 60 * 1000);

describe("recently ended timers", () => {
  beforeEach(() => forgetEndedTimers());

  it("keeps a reset timer for an hour after its window closed", () => {
    recordEndedTimer(1, endsAt);
    expect(getRecentlyEndedAt(makeTimer(), minutesAfter(59))).toEqual(endsAt);
    expect(getRecentlyEndedAt(makeTimer(), minutesAfter(61))).toBeNull();
  });

  it("drops a timer once it has a new tod", () => {
    recordEndedTimer(1, endsAt);
    expect(getRecentlyEndedAt(makeTimer({ lastTod: 1 }), minutesAfter(20))).toBeNull();
    expect(getRecentlyEndedAt(makeTimer(), minutesAfter(20))).toBeNull();
  });

  it("drops timers that are cleared manually", () => {
    recordEndedTimer(1, endsAt);
    recordEndedTimer(2, endsAt);
    forgetEndedTimers([1]);
    expect(getRecentlyEndedAt(makeTimer({ id: 1 }), minutesAfter(20))).toBeNull();
    expect(getRecentlyEndedAt(makeTimer({ id: 2 }), minutesAfter(20))).toEqual(endsAt);
  });

  it("ignores timers that were never recorded", () => {
    expect(getRecentlyEndedAt(makeTimer(), minutesAfter(5))).toBeNull();
  });
});
