import { ITEMS, bankRequest, prettyLoc, priceText, requestedFrom, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";
import { loginRoute } from "./route";

// One #bank-requests post for the whole tab, in the shape Discord's API takes, so the page can
// preview exactly what the bot will send.
// `item` is the item whose icon goes in the corner (the bot links its public /icons/ image).
export interface Embed { title: string; description: string; color: number; item?: number; footer?: string }
// Where the post goes: the bank requests channel, or the jewelry requests channel for made-to-order jewelry.
export interface RequestMessage { embeds: Embed[]; channel: "bank" | "jewelry" }
export const channelName = (channel: RequestMessage["channel"]) => channel === "jewelry" ? "#jewelry-requests" : "#bank-requests";

const BLURPLE = 0x5865f2;
const GREY = 0x4e5058;

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
// The login route's characters come first, then the rest, each by character, then spot, so one
// character's spots sit together and a banker logs in to each character once for the whole request.
// Made-to-order jewelry is found in the bank's own tabs, and a multiquest holder isn't a spot to send to.
function spots(it: Item, from: string[]) {
  const holders = it.jewelry ? it.holders.filter(h => !h.mq) : requestedFrom(it).holders;
  if (!holders.length) return "Made to order.";
  const planned = (h: Item["holders"][number]) => from.includes(h.char);
  const sorted = [...holders].sort((a, b) =>
    +planned(b) - +planned(a) || a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true }));
  const shown = sorted.slice(0, 6).map(h => `• ${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = sorted.length - shown.length;
  return [...shown, ...(more > 0 ? [`-# …and ${more} more`] : [])].join("\n");
}

// A tab's bank items and its jewelry each post to their own channel, so a mixed tab gives two posts.
export function requestMessages(tab: Tab, cls: ClassId | null): RequestMessage[] {
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    if (!it) return [];
    const req = bankRequest(it, cls, qty);
    return [{ it, qty, req, auction: req.price.kind === "auction" }];
  });
  const posts = (["bank", "jewelry"] as const).map(channel => {
    const mine = lines.filter(l => (channel === "jewelry") === !!l.it.jewelry);
    const total = totalText(tabTotal(tab, cls, it => (channel === "jewelry") === !!it.jewelry));
    return mine.length ? requestMessage(mine, total, channel) : null;
  });
  return posts.filter((m): m is RequestMessage => m !== null);
}

function requestMessage(lines: Line[], total: string, channel: RequestMessage["channel"]): RequestMessage {
  // Cards follow the route: the items on its first character, then the next. Multiquest items,
  // which aren't on it, come last.
  const { logins, lines: cards } = loginRoute(lines);
  // Jewelry is made to order, so there's no login to name for it.
  const shownLogins = channel === "bank" ? logins : [];
  // The site swaps this title for one naming the member, linked to their Discord profile.
  const request: Embed = {
    title: "Bank request",
    description: [...lines.map(l => `• ${l.qty > 1 ? `${l.qty} × ` : ""}${l.it.name} (${priceText(l.req.price, l.qty)})`), "", `**Total: ${total}**`, ...(shownLogins.length ? [`-# ${shownLogins.length === 1 ? "1 login" : `${shownLogins.length} logins`}: ${shownLogins.join(", ")}`] : [])].join("\n"),
    color: BLURPLE,
  };
  // One embed per item. The tab holds at most MAX_TAB_ITEMS, so this fits Discord's ten.
  const embeds: Embed[] = [request, ...cards.map(l => ({ title: l.it.name, description: spots(l.it, l.from), color: GREY, item: l.it.id }))];
  return { embeds, channel };
}
type Line = { it: Item; qty: number; req: ReturnType<typeof bankRequest>; auction: boolean };
