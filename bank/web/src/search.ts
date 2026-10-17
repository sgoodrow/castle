// The item list for the current filters: kind, slot, what the chosen class and race can use, and
// the search box, where every word has to appear in the item's name or stats.
import { ITEM_LIST, SLOT_CHIPS, statText, usable, type Item } from "./data";
import type { Filters } from "./state";

export function filterItems(f: Filters, list: Item[] = ITEM_LIST) {
  const bits = f.slot ? SLOT_CHIPS.find(([l]) => l === f.slot)![1] : null;
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const char = { cls: f.cls, race: f.race };
  const onlyUsable = f.cls >= 0 || f.race >= 0;
  return list.filter(it => {
    if (f.kind !== "all" && it.kind !== f.kind) return false;
    if (bits && !bits.some(b => (it.slots || 0) & (1 << b))) return false;
    if (onlyUsable && (it.kind === "gear" || it.kind === "spell") && !usable(it, char)) return false;
    if (terms.length) {
      const hay = (it.name + " " + statText(it)).toLowerCase();
      if (!terms.every(t => hay.includes(t))) return false;
    }
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}
