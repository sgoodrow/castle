import { ITEMS, bankRequest, type ClassId } from "./data";
import type { Tab } from "./state";

// What the tab adds up to in platinum, and whether anything on it still needs a banker's price.
export type TabTotal = { pp: number; ask: boolean };
export function tabTotal(tab: Tab, cls: ClassId | null): TabTotal {
  const t = { pp: 0, ask: false };
  for (const [id, qty] of Object.entries(tab)) {
    const it = ITEMS[+id];
    if (!it) continue; // no longer in the bank
    const pp = bankRequest(it, cls, qty).pp;
    if (pp == null) t.ask = true;
    else t.pp += pp * qty;
  }
  return t;
}
export const totalText = (t: TabTotal) => (!t.ask ? `${t.pp.toLocaleString()}pp` : t.pp ? `${t.pp.toLocaleString()}pp + ask` : "ask");
// The same, short enough for the header button: "680pp+" when some lines still need a price.
export const totalShort = (t: TabTotal) => (!t.ask ? `${t.pp.toLocaleString()}pp` : t.pp ? `${t.pp.toLocaleString()}pp+` : "ask");
