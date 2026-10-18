import { useEffect, useState } from "react";
import { CLASSES, CLASS_NAME, RACES, RACE_NAME, SLOT_CHIPS, type ClassId, type Kind, type RaceId, type SlotChip } from "./data";

export interface Filters {
  cls: ClassId | null; // null means any
  race: RaceId | null;
  q: string;
  kind: "all" | Kind;
  slot: SlotChip | null;
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

export const DEFAULT_FILTERS: Filters = { cls: null, race: null, q: "", kind: "all", slot: null, sort: "name" };

// ---------- filters live in the URL, readable: ?class=NEC&race=IKS&slot=head ----------
export interface Search {
  class?: ClassId;
  race?: RaceId;
  kind?: Kind;
  slot?: string;
  q?: string;
  sort?: Sort;
  item?: number; // the item whose details are open
}
const KINDS: Kind[] = ["gear", "spell", "bag", "other"];
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
// A positive whole number: from the address bar it's text, from the page's own links a number.
const id = (v: unknown) => { const n = Number(typeof v === "number" ? v : str(v)); return n > 0 && Number.isInteger(n) ? n : undefined; };
const oneOf = <T extends string>(v: unknown, ok: readonly T[]) => ok.find(o => o.toLowerCase() === str(v)?.toLowerCase());

// Anything unknown in the URL is dropped rather than trusted.
export function validateSearch(raw: Record<string, unknown>): Search {
  return {
    class: oneOf(raw.class, CLASSES.map(c => c.id)),
    race: oneOf(raw.race, RACES.map(r => r.id)),
    kind: oneOf(raw.kind, KINDS),
    slot: oneOf(raw.slot, SLOT_CHIPS.map(c => c.id))?.toLowerCase(),
    q: str(raw.q),
    sort: oneOf(raw.sort, SORTS),
    item: id(raw.item),
  };
}

export function toFilters(s: Search): Filters {
  return {
    cls: s.class ?? null,
    race: s.race ?? null,
    q: s.q ?? "",
    kind: s.kind ?? "all",
    slot: SLOT_CHIPS.find(c => c.id.toLowerCase() === s.slot)?.id ?? null,
    sort: s.sort ?? "name",
  };
}

// Defaults are left out so a plain visit has a plain URL.
export function toSearch(f: Filters): Search {
  return {
    class: f.cls ?? undefined,
    race: f.race ?? undefined,
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

export const KIND_LABEL: Record<Filters["kind"], string> = { all: "All", gear: "Gear", spell: "Spells", bag: "Bags", other: "Other" };

// The active filters, each with what clears it.
export function activeChips(f: Filters): { label: string; clear: Partial<Filters> }[] {
  const out: { label: string; clear: Partial<Filters> }[] = [];
  if (f.cls) out.push({ label: CLASS_NAME[f.cls], clear: { cls: null } });
  if (f.race) out.push({ label: RACE_NAME[f.race], clear: { race: null } });
  if (f.kind !== "all") out.push({ label: KIND_LABEL[f.kind], clear: { kind: "all" } });
  if (f.slot) out.push({ label: `Slot: ${f.slot}`, clear: { slot: null } });
  return out;
}
