import { useEffect, useState } from "react";
import { CLASSES, RACES, SLOT_CHIPS, type Kind } from "./data";

export interface Filters {
  cls: number;
  race: number;
  q: string;
  kind: "all" | Kind;
  slot: string | null;
  sort: Sort;
}
// What the list is ordered by; a leading "-" is high to low. Unknown prices count as 0.
export const SORTS = ["name", "-name", "price", "-price"] as const;
export type Sort = (typeof SORTS)[number];
export type SortKey = "name" | "price";
export const sortKey = (s: Sort): SortKey => (s === "name" || s === "-name" ? "name" : "price");
export const sortDesc = (s: Sort) => s.startsWith("-");
// Clicking a column: the same column flips direction; a new one starts low to high.
export const nextSort = (s: Sort, key: SortKey): Sort => (sortKey(s) !== key ? key : sortDesc(s) ? key : `-${key}`);
// Item id -> quantity on the tab.
export type Tab = Record<number, number>;

export const DEFAULT_FILTERS: Filters = { cls: -1, race: -1, q: "", kind: "all", slot: null, sort: "name" };

// ---------- filters live in the URL, readable: ?class=NEC&race=IKS&slot=head ----------
export interface Search {
  class?: string;
  race?: string;
  kind?: Kind;
  slot?: string;
  q?: string;
  sort?: Sort;
}
const KINDS: Kind[] = ["gear", "spell", "bag", "other"];
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const oneOf = <T extends string>(v: unknown, ok: readonly T[]) => ok.find(o => o.toLowerCase() === str(v)?.toLowerCase());

// Anything unknown in the URL is dropped rather than trusted.
export function validateSearch(raw: Record<string, unknown>): Search {
  return {
    class: oneOf(raw.class, CLASSES.map(c => c[0])),
    race: oneOf(raw.race, RACES.map(r => r[0])),
    kind: oneOf(raw.kind, KINDS),
    slot: oneOf(raw.slot, SLOT_CHIPS.map(s => s[0]))?.toLowerCase(),
    q: str(raw.q),
    sort: oneOf(raw.sort, SORTS),
  };
}

export function toFilters(s: Search): Filters {
  return {
    cls: CLASSES.findIndex(c => c[0] === s.class),
    race: RACES.findIndex(r => r[0] === s.race),
    q: s.q ?? "",
    kind: s.kind ?? "all",
    slot: SLOT_CHIPS.find(c => c[0].toLowerCase() === s.slot)?.[0] ?? null,
    sort: s.sort ?? "name",
  };
}

// Defaults are left out so a plain visit has a plain URL.
export function toSearch(f: Filters): Search {
  return {
    class: CLASSES[f.cls]?.[0],
    race: RACES[f.race]?.[0],
    kind: f.kind === "all" ? undefined : f.kind,
    slot: f.slot?.toLowerCase() || undefined,
    q: f.q || undefined,
    sort: f.sort === "name" ? undefined : f.sort,
  };
}

// Plain query strings, not TanStack's JSON-flavoured ones.
export const parseSearch = (s: string) => Object.fromEntries(new URLSearchParams(s));
export function stringifySearch(o: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v != null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ---------- the tab stays in this browser ----------
const KEY = "castle-bank-tab";

function load(): Tab {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s) return s;
    // Carry a tab over from the old combined key.
    return JSON.parse(localStorage.getItem("castle-bank-v2") || "null")?.tab || {};
  } catch { return {}; /* storage blocked */ }
}

export function useTab() {
  const [tab, setTab] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(tab)); } catch { /* storage blocked */ }
  }, [tab]);
  return [tab, setTab] as const;
}

export const KIND_OPTIONS = [
  { value: "all", label: "All" }, { value: "gear", label: "Gear" }, { value: "spell", label: "Spells" },
  { value: "bag", label: "Bags" }, { value: "other", label: "Other" },
];

// The active filters, each with what clears it.
export function activeChips(f: Filters): { label: string; clear: Partial<Filters> }[] {
  const out: { label: string; clear: Partial<Filters> }[] = [];
  if (f.cls >= 0) out.push({ label: CLASSES[f.cls][1], clear: { cls: -1 } });
  if (f.race >= 0) out.push({ label: RACES[f.race][1], clear: { race: -1 } });
  if (f.kind !== "all") out.push({ label: KIND_OPTIONS.find(k => k.value === f.kind)!.label, clear: { kind: "all" } });
  if (f.slot) out.push({ label: `Slot: ${f.slot}`, clear: { slot: null } });
  return out;
}
