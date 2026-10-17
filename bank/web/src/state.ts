import { useEffect, useState } from "react";
import { CLASSES, RACES, SLOT_CHIPS, type Kind } from "./data";

export interface Filters {
  cls: number;
  race: number;
  q: string;
  kind: "all" | Kind;
  slot: string | null;
}
// Item id -> quantity on the tab.
export type Tab = Record<number, number>;

export const DEFAULT_FILTERS: Filters = { cls: -1, race: -1, q: "", kind: "all", slot: null };

// ---------- filters live in the URL, readable: ?class=NEC&race=IKS&slot=head ----------
export interface Search {
  class?: string;
  race?: string;
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
    class: oneOf(raw.class, CLASSES.map(c => c[0])),
    race: oneOf(raw.race, RACES.map(r => r[0])),
    kind: oneOf(raw.kind, KINDS),
    slot: oneOf(raw.slot, SLOT_CHIPS.map(s => s[0]))?.toLowerCase(),
    q: str(raw.q),
  };
}

export function toFilters(s: Search): Filters {
  return {
    cls: CLASSES.findIndex(c => c[0] === s.class),
    race: RACES.findIndex(r => r[0] === s.race),
    q: s.q ?? "",
    kind: s.kind ?? "all",
    slot: s.slot?.toUpperCase() ?? null,
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
