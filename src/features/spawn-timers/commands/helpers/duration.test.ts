import { describe, it, expect } from "vitest";
import { parseDuration, formatDuration, formatTimeDistance } from "./duration";

describe("parseDuration", () => {
  it("should parse various duration formats", () => {
    expect(parseDuration("1 day")).toBe(86400);
    expect(parseDuration("2 days")).toBe(172800);
    expect(parseDuration("1 hour")).toBe(3600);
    expect(parseDuration("18 hours")).toBe(64800);
    expect(parseDuration("30 minutes")).toBe(1800);
    expect(parseDuration("10 minutes")).toBe(600);
    expect(parseDuration("1 week")).toBe(604800);
    expect(parseDuration("0 hours")).toBe(0);
  });

  it("should parse short formats", () => {
    expect(parseDuration("1d")).toBe(86400);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("30m")).toBe(1800);
    expect(parseDuration("45s")).toBe(45);
  });

  it("should parse combined formats", () => {
    expect(parseDuration("1 day 2 hours")).toBe(93600);
  });

  it("should return null for invalid input", () => {
    expect(parseDuration("")).toBe(null);
    expect(parseDuration("abc")).toBe(null);
  });
});

describe("formatDuration", () => {
  it("should format durations in short format", () => {
    expect(formatDuration(86400)).toBe("1d");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7200)).toBe("2h");
    expect(formatDuration(90000)).toBe("1d 1h");
    expect(formatDuration(14400)).toBe("4h");
  });

  it("should format durations in long format", () => {
    expect(formatDuration(86400, "long")).toBe("1 day");
    expect(formatDuration(172800, "long")).toBe("2 days");
    expect(formatDuration(3600, "long")).toBe("1 hour");
    expect(formatDuration(93600, "long")).toBe("1 day 2 hours");
  });
});

describe("formatTimeDistance", () => {
  it("should calculate distance between two times", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const target = new Date("2021-05-27T22:57:00Z");
    expect(formatTimeDistance(target, now)).toBe("17h");
  });

  it("should handle future and past correctly", () => {
    const now = new Date("2021-05-27T05:57:00Z");
    const past = new Date("2021-05-27T03:57:00Z");
    expect(formatTimeDistance(past, now)).toBe("2h");
  });
});
