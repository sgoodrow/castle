import { ITEMS, bankRequest, prettyLoc, priceText, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";

// One #bank-requests post for the whole tab, in the shape Discord's API takes, so the page can
// preview exactly what the bot will send.
// `item` is the item whose icon goes in the corner (the bot links its public /icons/ image).
export interface Embed { title: string; description: string; color: number; item?: number; footer?: string }
export interface RequestMessage { embeds: Embed[] }

// Discord's limits: ten embeds a message, and a description of 4096 characters.
const MAX_EMBEDS = 10;
const BLURPLE = 0x5865f2;
const GREY = 0x4e5058;

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
function spots(it: Item) {
  const shown = it.holders.slice(0, 6).map(h => `• ${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = it.holders.length - shown.length;
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
    description: [...lines.map(l => `• ${l.qty > 1 ? `${l.qty} × ` : ""}${l.it.name} (${l.req.text == null ? "not for sale" : priceText(l.req.price, l.qty)})`), "", `**Total: ${total}**`].join("\n"),
    color: BLURPLE,
  };
  // One embed per item; past Discord's limit, the rest share the last one.
  const room = MAX_EMBEDS - 1;
  const own = lines.length <= room ? lines : lines.slice(0, room - 1);
  const rest = lines.slice(own.length);
  const embeds: Embed[] = [
    request,
    ...own.map(l => ({ title: l.it.name, description: spots(l.it), color: GREY, item: l.it.id })),
    ...(rest.length ? [{ title: `${rest.length} more items`, description: rest.map(l => `**${l.it.name}**\n${spots(l.it)}`).join("\n\n"), color: GREY }] : []),
  ];
  return { embeds };
}
