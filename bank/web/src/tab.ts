import { ITEMS, bankRequest, type ClassId } from "./data";
import type { Tab } from "./state";

// What the tab adds up to in platinum, and how many lines still need a banker's price.
export type TabTotal = { pp: number; unknown: number };
export function tabTotal(tab: Tab, cls: ClassId | null): TabTotal {
  const t = { pp: 0, unknown: 0 };
  for (const [id, qty] of Object.entries(tab)) {
    const it = ITEMS[+id];
    if (!it) continue; // no longer in the bank
    const pp = bankRequest(it, cls, qty).pp;
    if (pp == null) t.unknown++;
    else t.pp += pp * qty;
  }
  return t;
}
const pp = (t: TabTotal) => `${t.pp.toLocaleString()}pp`;
// "160pp + 3 unknown" when some lines still need a price.
export const totalText = (t: TabTotal) => (!t.unknown ? pp(t) : t.pp ? `${pp(t)} + ${t.unknown} unknown` : `${t.unknown} unknown`);
// The same, short enough for the header button: "160pp+" when some lines still need a price.
export const totalShort = (t: TabTotal) => (!t.unknown ? pp(t) : t.pp ? `${pp(t)}+` : `${t.unknown} unknown`);
