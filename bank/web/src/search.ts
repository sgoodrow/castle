// The item list for the current filters: kind, slot, what the chosen class and race can use, and
// the search box, where every word has to appear in the item's name or stats. Then the chosen sort.
import { ITEM_LIST, SLOT_CHIP_BITS, bankRequest, statText, usable, type BankRequest, type ClassId, type Item } from "./data";
import { sortDesc, sortKey, type Filters, type Sort } from "./state";

export function filterItems(f: Filters, list: Item[] = ITEM_LIST) {
  const bits = f.slot ? SLOT_CHIP_BITS[f.slot] : null;
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const char = { cls: f.cls, race: f.race };
  const onlyUsable = f.cls != null || f.race != null;
  const found = list.filter(it => {
    if (f.kind === "sky" ? !it.sky : f.kind !== "all" && it.kind !== f.kind) return false;
    if (bits && !bits.some(b => (it.slots || 0) & (1 << b))) return false;
    if (onlyUsable && (it.kind === "gear" || it.kind === "spell") && !usable(it, char)) return false;
    if (terms.length) {
      const hay = (it.name + " " + statText(it)).toLowerCase();
      if (!terms.every(t => hay.includes(t))) return false;
    }
    return true;
  });
  return sortItems(found, f.sort, f.cls);
}

// Price is what this class would pay; an unknown price counts as 0, and
// a DKP auction above any platinum price.
function sortPrice(req: BankRequest) {
  switch (req.price.kind) {
    case "pp": return req.price.pp;
    case "free": case "ask": return 0;
    case "auction": return Number.MAX_SAFE_INTEGER;
  }
}
function sortItems(items: Item[], sort: Sort, cls: ClassId | null) {
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name);
  const dir = sortDesc(sort) ? -1 : 1;
  switch (sortKey(sort)) {
    case "name":
      return items.sort((a, b) => dir * byName(a, b));
    case "price":
      return items
        .map(it => ({ it, pp: sortPrice(bankRequest(it, cls)) }))
        .sort((a, b) => dir * (a.pp - b.pp) || byName(a.it, b.it))
        .map(p => p.it);
  }
}
