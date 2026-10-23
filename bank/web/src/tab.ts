import { ITEMS, bankRequest, type ClassId, type Item } from "./data";
import type { Tab } from "./state";

// What the tab adds up to in platinum, how many lines go to DKP auction, and how many still need a
// banker's price.
export type TabTotal = { pp: number; auctions: number; unknown: number };
export function tabTotal(tab: Tab, cls: ClassId | null, keep: (it: Item) => boolean = () => true): TabTotal {
  const t = { pp: 0, auctions: 0, unknown: 0 };
  for (const [id, qty] of Object.entries(tab)) {
    const it = ITEMS[+id];
    if (!it || !keep(it)) continue; // no longer in the bank, or posted elsewhere
    const req = bankRequest(it, cls, qty);
    switch (req.price.kind) {
      case "pp": t.pp += req.price.pp * qty; break;
      case "free": break;
      case "auction": t.auctions++; break;
      case "ask": t.unknown++; break;
    }
  }
  return t;
}
// The parts besides platinum: "1 DKP auction", "3 unknown costs".
const extras = (t: TabTotal) => [
  ...(t.auctions ? [`${t.auctions} DKP auction${t.auctions > 1 ? "s" : ""}`] : []),
  ...(t.unknown ? [`${t.unknown} unknown cost${t.unknown > 1 ? "s" : ""}`] : []),
];
const pp = (t: TabTotal) => `${t.pp.toLocaleString()}pp`;
// "450pp + 1 DKP auction + 3 unknown costs", leaving out 0pp when there's something else.
export const totalText = (t: TabTotal) => {
  const more = extras(t);
  return [...(t.pp || !more.length ? [pp(t)] : []), ...more].join(" + ");
};
// The same, short enough for the header button: "450pp+" when there's more than platinum.
export const totalShort = (t: TabTotal) => {
  const [first, ...rest] = extras(t);
  if (!first) return pp(t);
  return t.pp ? `${pp(t)}+` : `${first}${rest.length ? "+" : ""}`;
};
