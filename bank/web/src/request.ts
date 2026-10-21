import { ITEMS, bankRequest, prettyLoc, priceText, requestedFrom, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";

// One #bank-requests post for the whole tab, in the shape Discord's API takes, so the page can
// preview exactly what the bot will send.
// `item` is the item whose icon goes in the corner (the bot links its public /icons/ image).
export interface Embed { title: string; description: string; color: number; item?: number; footer?: string }
export interface RequestMessage { embeds: Embed[] }

const BLURPLE = 0x5865f2;
const GREY = 0x4e5058;

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
// Sorted by character, then spot, so one character's spots sit together and a banker logs in
// to each character once, in the same order on every card.
const byCharThenSpot = (a: Item["holders"][number], b: Item["holders"][number]) =>
  a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true });

function spots(it: Item) {
  const { holders } = requestedFrom(it);
  const shown = [...holders].sort(byCharThenSpot).slice(0, 6).map(h => `• ${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = holders.length - shown.length;
  return [...shown, ...(more > 0 ? [`-# …and ${more} more`] : [])].join("\n");
}

export function requestMessage(tab: Tab, cls: ClassId | null): RequestMessage | null {
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    return it ? [{ it, qty, req: bankRequest(it, cls, qty) }] : [];
  });
  if (!lines.length) return null;
  const total = totalText(tabTotal(tab, cls));
  // The site swaps this title for one naming the member, linked to their Discord profile.
  const request: Embed = {
    title: "Bank request",
    description: [...lines.map(l => `• ${l.qty > 1 ? `${l.qty} × ` : ""}${l.it.name} (${priceText(l.req.price, l.qty)})`), "", `**Total: ${total}**`].join("\n"),
    color: BLURPLE,
  };
  // One embed per item. The tab holds at most MAX_TAB_ITEMS, so this fits Discord's ten.
  // An item kept in one place says where to pick it up.
  const embeds: Embed[] = [request, ...lines.map(l => ({
    title: l.it.name, description: spots(l.it), color: GREY, item: l.it.id,
    ...(l.req.pickup ? { footer: `Pick up at ${l.req.pickup}.` } : {}),
  }))];
  return { embeds };
}
