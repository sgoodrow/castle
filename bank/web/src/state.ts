import { useEffect, useState } from "react";
import { CLASSES, CLASS_NAME, RACES, RACE_NAME, SLOT_CHIPS, type ClassId, type Kind, type RaceId, type SlotChip } from "./data";

export interface Filters {
  cls: ClassId | null; // null means any
  race: RaceId | null;
  q: string;
  kind: "all" | Kind;
  slot: SlotChip | null;
}
// Item id -> quantity on the tab.
export type Tab = Record<number, number>;

export const DEFAULT_FILTERS: Filters = { cls: null, race: null, q: "", kind: "all", slot: null };

// ---------- filters live in the URL, readable: ?class=NEC&race=IKS&slot=head ----------
export interface Search {
  class?: ClassId;
  race?: RaceId;
  kind?: Kind;
  slot?: string;
  q?: string;
}
const KINDS: Kind[] = ["gear", "spell", "bag", "other"];
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const oneOf = <T extends string>(v: unknown, ok: readonly T[]) => ok.find(o => o.toLowerCase() === str(v)?.toLowerCase());

// Anything unknown in the URL is dropped rather than trusted.
export function validateSearch(raw: Record<string, unknown>): Search {
  return {
    class: oneOf(raw.class, CLASSES.map(c => c.id)),
    race: oneOf(raw.race, RACES.map(r => r.id)),
    kind: oneOf(raw.kind, KINDS),
    slot: oneOf(raw.slot, SLOT_CHIPS.map(c => c.id))?.toLowerCase(),
    q: str(raw.q),
  };
}

export function toFilters(s: Search): Filters {
  return {
    cls: s.class ?? null,
    race: s.race ?? null,
    q: s.q ?? "",
    kind: s.kind ?? "all",
    slot: SLOT_CHIPS.find(c => c.id.toLowerCase() === s.slot)?.id ?? null,
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
  if (f.cls) out.push({ label: CLASS_NAME[f.cls], clear: { cls: null } });
  if (f.race) out.push({ label: RACE_NAME[f.race], clear: { race: null } });
  if (f.kind !== "all") out.push({ label: KIND_OPTIONS.find(k => k.value === f.kind)?.label ?? f.kind, clear: { kind: "all" } });
  if (f.slot) out.push({ label: `Slot: ${f.slot}`, clear: { slot: null } });
  return out;
}
