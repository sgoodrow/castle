import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, activeChips, parseSearch, stringifySearch, toFilters, toSearch, validateSearch } from "./state";

describe("the URL", () => {
  it("keeps known filters, matching case-insensitively, and drops the rest", () => {
    expect(validateSearch({ class: "nec", race: "IKS", kind: "Gear", slot: "HEAD", q: "bone", junk: "x" })).toEqual({
      class: "NEC", race: "IKS", kind: "gear", slot: "head", q: "bone",
    });
    expect(validateSearch({ class: "XYZ", kind: 3, q: "" })).toEqual({
      class: undefined, race: undefined, kind: undefined, slot: undefined, q: undefined,
    });
  });

  it("turns search params into filters and back", () => {
    const f = toFilters({ class: "NEC", race: "IKS", slot: "head", q: "bone" });
    expect(f).toEqual({ cls: 10, race: 12, q: "bone", kind: "all", slot: "Head" });
    expect(toSearch(f)).toEqual({ class: "NEC", race: "IKS", kind: undefined, slot: "head", q: "bone" });
  });

  it("gives a plain visit a plain URL", () => {
    expect(toFilters({})).toEqual(DEFAULT_FILTERS);
    expect(stringifySearch(toSearch(DEFAULT_FILTERS) as Record<string, unknown>)).toBe("");
  });

  it("reads and writes ordinary query strings", () => {
    expect(stringifySearch({ class: "NEC", q: "a b", empty: "", none: undefined })).toBe("?class=NEC&q=a+b");
    expect(parseSearch("?class=NEC&q=a+b")).toEqual({ class: "NEC", q: "a b" });
  });
});

describe("activeChips", () => {
  it("lists each active filter with what clears it", () => {
    expect(activeChips({ cls: 10, race: 12, q: "ignored", kind: "spell", slot: "Head" })).toEqual([
      { label: "Necromancer", clear: { cls: -1 } },
      { label: "Iksar", clear: { race: -1 } },
      { label: "Spells", clear: { kind: "all" } },
      { label: "Slot: Head", clear: { slot: null } },
    ]);
    expect(activeChips(DEFAULT_FILTERS)).toEqual([]);
  });
});
