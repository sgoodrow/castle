import type { Timer } from "@prisma/client";
import {
  displayWindow,
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
  inWindow,
  pastPossibleSpawnTime,
  lastSpawnTimeStart,
  getWindowStart,
  getWindowEnd,
  getVariance,
} from "./timer";

/** Helper to create a Timer-like object for testing. */
function makeTimer(overrides: Partial<Timer> = {}): Timer {
  return {
    id: 1,
    name: "test",
    windowStart: null,
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

describe("displayWindow", () => {
  it("should calculate display window for window_start + window_end", () => {
    const timer = makeTimer({
      windowStart: "1 day",
      windowEnd: "2 days",
    });
    expect(displayWindow(timer)).toBe("1d");
  });

  it("should calculate display window for window_start + variance", () => {
    const timer = makeTimer({
      windowStart: "1 day",
      variance: "2 hours",
    });
    expect(displayWindow(timer)).toBe("4h");
  });

  it("should calculate display window for all three", () => {
    const timer = makeTimer({
      windowStart: "1 day",
      windowEnd: "2 days",
      variance: "1 hour",
    });
    expect(displayWindow(timer)).toBe("1d 2h");
  });

  it("should return null for window_start only", () => {
    const timer = makeTimer({ windowStart: "1 day" });
    expect(displayWindow(timer)).toBe(null);
  });
});

describe("displayWindow with skip count", () => {
  it("should multiply window with skip_count=1 (variance)", () => {
    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      skipCount: 1,
    });
    // skip_count=1 means multiply by 2:
    // windowStart = 18h * 2 = 36h, variance = 1h * 2 = 2h
    // duration = (36h + 2h) - (36h - 2h) = 38h - 34h = 4h
    expect(displayWindow(timer)).toBe("4h");
  });

  it("should multiply window with skip_count=2 (variance)", () => {
    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      skipCount: 2,
    });
    // skip_count=2 means multiply by 3:
    // windowStart = 18h * 3 = 54h, variance = 1h * 3 = 3h
    // duration = (54h + 3h) - (54h - 3h) = 57h - 51h = 6h
    expect(displayWindow(timer)).toBe("6h");
  });

  it("should multiply window with skip_count=1 (window_start + window_end)", () => {
    const timer = makeTimer({
      windowStart: "17 hours",
      windowEnd: "19 hours",
      skipCount: 1,
    });
    // skip_count=1 means multiply by 2:
    // windowStart = 17h * 2 = 34h, windowEnd = 19h * 2 = 38h
    // duration = 38h - 34h = 4h
    expect(displayWindow(timer)).toBe("4h");
  });

  it("should multiply window with skip_count=2 (window_start + window_end)", () => {
    const timer = makeTimer({
      windowStart: "17 hours",
      windowEnd: "19 hours",
      skipCount: 2,
    });
    // skip_count=2 means multiply by 3:
    // windowStart = 17h * 3 = 51h, windowEnd = 19h * 3 = 57h
    // duration = 57h - 51h = 6h
    expect(displayWindow(timer)).toBe("6h");
  });
});

describe("nextSpawnTimeStart", () => {
  it("should calculate start time with variance", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      lastTod: todEpoch,
    });

    const start = nextSpawnTimeStart(timer);
    // 18h - 1h = 17h from TOD
    const expected = new Date(now.getTime() + 17 * 3600 * 1000);
    expect(start!.getTime()).toBe(expected.getTime());
  });

  it("should calculate start time without variance", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      lastTod: todEpoch,
    });

    const start = nextSpawnTimeStart(timer);
    const expected = new Date(now.getTime() + 18 * 3600 * 1000);
    expect(start!.getTime()).toBe(expected.getTime());
  });

  it("should apply skip multiplier", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      skipCount: 1,
      lastTod: todEpoch,
    });

    const start = nextSpawnTimeStart(timer);
    // With skip_count=1: windowStart = 36h, variance = 2h
    // start = tod + 36h - 2h = tod + 34h
    const expected = new Date(now.getTime() + 34 * 3600 * 1000);
    expect(start!.getTime()).toBe(expected.getTime());
  });
});

describe("nextSpawnTimeEnd", () => {
  it("should calculate end time with window_end and variance", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "17 hours",
      windowEnd: "19 hours",
      variance: "1 hour",
      lastTod: todEpoch,
    });

    const end = nextSpawnTimeEnd(timer);
    // windowEnd + variance = 19h + 1h = 20h
    const expected = new Date(now.getTime() + 20 * 3600 * 1000);
    expect(end!.getTime()).toBe(expected.getTime());
  });

  it("should calculate end time with only window_end", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "17 hours",
      windowEnd: "19 hours",
      lastTod: todEpoch,
    });

    const end = nextSpawnTimeEnd(timer);
    const expected = new Date(now.getTime() + 19 * 3600 * 1000);
    expect(end!.getTime()).toBe(expected.getTime());
  });

  it("should calculate end time with only variance", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      lastTod: todEpoch,
    });

    const end = nextSpawnTimeEnd(timer);
    // windowStart + variance = 18h + 1h = 19h
    const expected = new Date(now.getTime() + 19 * 3600 * 1000);
    expect(end!.getTime()).toBe(expected.getTime());
  });

  it("should fall back to window_start with no window_end or variance", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      lastTod: todEpoch,
    });

    const end = nextSpawnTimeEnd(timer);
    const expected = new Date(now.getTime() + 18 * 3600 * 1000);
    expect(end!.getTime()).toBe(expected.getTime());
  });
});

describe("inWindow", () => {
  it("should be in window when time is between start and end", () => {
    const todTime = new Date("2021-05-27T05:57:00Z");
    const todEpoch = todTime.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      lastTod: todEpoch,
    });

    // Window: 17h to 19h after TOD
    const inWindowTime = new Date(todTime.getTime() + 18 * 3600 * 1000);
    expect(inWindow(timer, inWindowTime)).toBe(true);
  });

  it("should not be in window before start", () => {
    const todTime = new Date("2021-05-27T05:57:00Z");
    const todEpoch = todTime.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      lastTod: todEpoch,
    });

    const beforeWindow = new Date(todTime.getTime() + 16 * 3600 * 1000);
    expect(inWindow(timer, beforeWindow)).toBe(false);
  });

  it("should not be in window after end + 10 minutes", () => {
    const todTime = new Date("2021-05-27T05:57:00Z");
    const todEpoch = todTime.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "18 hours",
      variance: "1 hour",
      lastTod: todEpoch,
    });

    // After end + 10 minutes
    const afterWindow = new Date(
      todTime.getTime() + (19 * 3600 + 11 * 60) * 1000
    );
    expect(inWindow(timer, afterWindow)).toBe(false);
  });
});

describe("lastSpawnTimeStart", () => {
  it("should calculate backward from TOD with variance", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const todEpoch = now.getTime() / 1000;

    const timer = makeTimer({
      windowStart: "2 days",
      variance: "1 day",
      lastTod: todEpoch,
    });

    const last = lastSpawnTimeStart(timer, todEpoch);
    // tod - windowStart - variance = tod - 2d - 1d = tod - 3d
    const expected = new Date(now.getTime() - 3 * 86400 * 1000);
    expect(last!.getTime()).toBe(expected.getTime());
  });
});
