// What a filled slot in a mule's inventory upload holds for the bank. The bank page and a banker's
// plan both read the bank through this, so they always agree on what's in it.

// A slot as the uploads store it: the character by its lowercase name, and maybe no count.
export interface SlotRow {
  charName: string;
  slot: string;
  itemId: number | null;
  count: number | null;
  item: { name: string } | null;
}

// Who holds it, where, which item and how many.
export interface Stock {
  char: string;
  loc: string;
  id: number;
  count: number;
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The slot's stock, or null when it holds nothing the bank can hand out: an empty slot, or a NO DROP
// item, which can't leave the bank. A slot with no count, or a count of 0, holds one.
export const stockIn = <R extends SlotRow>(
  s: R,
  nodrop: (id: number) => boolean
): (Stock & { item: NonNullable<R["item"]> }) | null =>
  s.itemId && s.item && s.item.name !== "Empty" && !nodrop(s.itemId)
    ? {
        char: titleCase(s.charName),
        loc: s.slot,
        id: s.itemId,
        count: s.count || 1,
        item: s.item,
      }
    : null;
