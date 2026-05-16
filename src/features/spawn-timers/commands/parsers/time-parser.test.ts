import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseTime } from "./time-parser";

describe("TimeParser", () => {
  describe("relative times", () => {
    it("should parse '20 minutes ago'", () => {
      const now = new Date("2021-05-27T05:57:00Z");
      const result = parseTime("20 minutes ago", now);
      expect(result).not.toBeNull();
      // Should be 20 minutes before reference
      const expected = new Date("2021-05-27T05:37:00Z");
      expect(Math.abs(result!.getTime() - expected.getTime())).toBeLessThan(
        60000
      );
    });

    it("should parse '-20' as 20 minutes ago", () => {
      const now = new Date("2021-05-27T05:57:00Z");
      const result = parseTime("-20", now);
      expect(result).not.toBeNull();
      const expected = new Date("2021-05-27T05:37:00Z");
      expect(Math.abs(result!.getTime() - expected.getTime())).toBeLessThan(
        60000
      );
    });

    it("should parse 'one day ago at noon'", () => {
      const now = new Date("2021-05-27T05:57:00Z");
      const result = parseTime("one day ago at noon", now);
      expect(result).not.toBeNull();
      // Should be yesterday at noon (local time)
      const expected = new Date(2021, 4, 26, 12, 0, 0);
      expect(Math.abs(result!.getTime() - expected.getTime())).toBeLessThan(
        60000
      );
    });
  });

  describe("dot notation", () => {
    it("should convert dots to colons in time", () => {
      const now = new Date("2021-05-27T05:57:00Z");
      // "10.58 pm" should be treated as "10:58 pm"
      const result = parseTime("10.58 pm", now);
      expect(result).not.toBeNull();
    });
  });

  describe("null handling", () => {
    it("should return null for empty input", () => {
      expect(parseTime("")).toBeNull();
      expect(parseTime("  ")).toBeNull();
    });
  });
});
