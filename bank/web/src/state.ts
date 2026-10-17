import { useEffect, useState } from "react";
import type { Kind } from "./data";

export interface Filters {
  cls: number;
  race: number;
  usableOnly: boolean;
  q: string;
  kind: "all" | Kind;
  banker: string | null;
  sort: string;
  slot: string | null;
}
// Item id -> quantity on the tab.
export type Tab = Record<number, number>;

interface Saved { f: Filters; tab: Tab }
const KEY = "castle-bank-v2";
const DEFAULTS: Saved = {
  f: { cls: -1, race: -1, usableOnly: true, q: "", kind: "all", banker: null, sort: "name", slot: null },
  tab: {},
};

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s) return { f: { ...DEFAULTS.f, ...s.f, q: "" }, tab: s.tab || {} };
  } catch { /* storage blocked */ }
  return DEFAULTS;
}

// Filters and the tab survive a reload in this browser; nothing else is stored.
export function useSaved() {
  const [saved, setSaved] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage blocked */ }
  }, [saved]);
  return [saved, setSaved] as const;
}
