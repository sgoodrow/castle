import { ITEMS, bankRequest, prettyLoc, priceText, requestedFrom, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";
import { loginRoute } from "./route";

// One #bank-requests post for the whole tab, in the shape Discord's API takes, so the page can
// preview exactly what the bot will send.
// `item` is the item whose icon goes in the corner (the bot links its public /icons/ image).
export interface Embed { title: string; description: string; color: number; item?: number; footer?: string }
export interface RequestMessage { embeds: Embed[] }

const BLURPLE = 0x5865f2;
const GREY = 0x4e5058;

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
// The login route's characters come first, then the rest, each by character, then spot, so one
// character's spots sit together and a banker logs in to each character once for the whole request.
function spots(it: Item, from: string[]) {
  const planned = (h: Item["holders"][number]) => from.includes(h.char);
  const sorted = [...requestedFrom(it).holders].sort((a, b) =>
    +planned(b) - +planned(a) || a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true }));
  const shown = sorted.slice(0, 6).map(h => `• ${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = sorted.length - shown.length;
  return [...shown, ...(more > 0 ? [`-# …and ${more} more`] : [])].join("\n");
}

export function requestMessage(tab: Tab, cls: ClassId | null): RequestMessage | null {
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    if (!it) return [];
    const req = bankRequest(it, cls, qty);
    return [{ it, qty, req, auction: req.price.kind === "auction" }];
  });
  if (!lines.length) return null;
  const total = totalText(tabTotal(tab, cls));
  // Cards follow the route: the items on its first character, then the next. Multiquest items,
  // which aren't on it, come last.
  const { logins, lines: cards } = loginRoute(lines);
  // The site swaps this title for one naming the member, linked to their Discord profile.
  const request: Embed = {
    title: "Bank request",
    description: [...lines.map(l => `• ${l.qty > 1 ? `${l.qty} × ` : ""}${l.it.name} (${priceText(l.req.price, l.qty)})`), "", `**Total: ${total}**`, ...(logins.length ? [`-# ${logins.length === 1 ? "1 login" : `${logins.length} logins`}: ${logins.join(", ")}`] : [])].join("\n"),
    color: BLURPLE,
  };
  // One embed per item. The tab holds at most MAX_TAB_ITEMS, so this fits Discord's ten.
  const embeds: Embed[] = [request, ...cards.map(l => ({ title: l.it.name, description: spots(l.it, l.from), color: GREY, item: l.it.id }))];
  return { embeds };
}
