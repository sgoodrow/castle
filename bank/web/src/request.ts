import { ITEMS, SNAPSHOT_AT, bankRequest, prettyLoc, priceText, requestedFrom, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";
import { loginRoute, type Planned } from "./route";

// One #bank-requests post for the whole tab, in the shape Discord's API takes, so the page can
// preview exactly what the bot will send. The summary is one embed; the items' cards are the fields
// of a second, so a full tab stays inside Discord's limits.
export interface Field { name: string; value: string }
export interface Embed { description: string; color: number; fields?: Field[] }
// Where the post goes: the bank requests channel, or the jewelry requests channel for made-to-order jewelry.
// `items` are the tab items on the post, so a post that goes through can take them off the tab.
export interface RequestMessage { embeds: Embed[]; channel: "bank" | "jewelry"; items: number[] }
export const channelName = (channel: RequestMessage["channel"]) => channel === "jewelry" ? "#jewelry-requests" : "#bank-requests";

const BLURPLE = 0x5865f2;
const GREY = 0x4e5058;
// Discord's fields need a name, and a field name can't hold a link. A blank name keeps the card's
// link at the top of its value.
export const BLANK = "\u200b";

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
// The login route's characters come first, then the rest, each by character, then spot, so one
// character's spots sit together and a banker logs in to each character once for the whole request.
// Made-to-order jewelry is found in the bank's own tabs, and a multiquest holder isn't a spot to send to.
// `inline` puts the spots on one line, for a bullet's subtext; otherwise each is a bullet of its own.
function spots(it: Item, from: string[], inline: boolean) {
  const holders = it.jewelry ? it.holders.filter(h => !h.mq) : requestedFrom(it).holders;
  if (!holders.length) return "Made to order.";
  const planned = (h: Item["holders"][number]) => from.includes(h.char);
  const sorted = [...holders].sort((a, b) =>
    +planned(b) - +planned(a) || a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true }));
  const shown = sorted.slice(0, 6).map(h => `${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = sorted.length - shown.length;
  if (inline) return [...shown, ...(more > 0 ? [`…and ${more} more`] : [])].join(", ");
  return [...shown.map(s => `• ${s}`), ...(more > 0 ? [`-# …and ${more} more`] : [])].join("\n");
}

// How a post lists its items: a field per login for the bank, and for jewelry either a card per item
// or a linked bullet per item in one embed.
type Style = "cards" | "bullets" | "logins";

// A tab's bank items and its jewelry each post to their own channel, so a mixed tab gives two posts.
export function requestMessages(tab: Tab, cls: ClassId | null, picks: { jewelryBullets: boolean }): RequestMessage[] {
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    if (!it) return [];
    const req = bankRequest(it, cls, qty);
    return [{ it, qty, req, auction: req.price.kind === "auction" }];
  });
  const posts = (["bank", "jewelry"] as const).map(channel => {
    const mine = lines.filter(l => (channel === "jewelry") === !!l.it.jewelry);
    const total = totalText(tabTotal(tab, cls, it => (channel === "jewelry") === !!it.jewelry));
    const style: Style = channel === "jewelry" ? (picks.jewelryBullets ? "bullets" : "cards") : "logins";
    return mine.length ? requestMessage(mine, total, channel, style) : null;
  });
  return posts.filter((m): m is RequestMessage => m !== null);
}

// A line's quantity, before its item, when there is more than one.
const quantity = (qty: number) => (qty > 1 ? `${qty} × ` : "");

// An item's name, linked to its P99 wiki page. The page's address can hold parentheses, which would
// end the link early, so they're written as their escapes.
const itemName = (it: Item) => it.wiki ? `[${it.name}](${it.wiki.replace(/\(/g, "%28").replace(/\)/g, "%29")})` : it.name;

function requestMessage(lines: Line[], total: string, channel: RequestMessage["channel"], style: Style): RequestMessage {
  // Cards follow the route: the items on its first character, then the next. Multiquest items,
  // which aren't on it, come last.
  const { logins, lines: cards } = loginRoute(lines);
  // Jewelry is made to order, so there's no login to name for it.
  const shownLogins = channel === "bank" ? logins : [];
  // Bullets link each item's name and list its spots under it, so the post needs no cards.
  const rows = style === "bullets"
    ? cards.flatMap(l => [`• ${quantity(l.qty)}${itemName(l.it)} (${priceText(l.req.price, l.qty)})`, `-# ${spots(l.it, l.from, true)}`])
    : lines.map(l => `• ${quantity(l.qty)}${l.it.name} (${priceText(l.req.price, l.qty)})`);
  // The site opens this with a line naming the member, linked to their Discord profile.
  const request: Embed = {
    description: [...rows, "", `**Total: ${total}**`, ...(shownLogins.length ? [`-# ${shownLogins.length === 1 ? "1 login" : `${shownLogins.length} logins`}: ${shownLogins.join(", ")}`] : []), ...(style === "logins" ? [`-# Inventory as of ${SNAPSHOT_AT.toLocaleString()}`] : [])].join("\n"),
    color: BLURPLE,
  };
  const items = lines.map(l => l.it.id);
  if (style === "bullets") return { embeds: [request], channel, items };
  // One field per item, in the order of the logins, or one per login with the items to take from it.
  const fields = style === "logins" ? loginFields(logins, cards) : cards.map(l => ({ name: BLANK, value: `${quantity(l.qty)}${itemName(l.it)}\n${spots(l.it, l.from, false)}` }));
  return { embeds: [request, { description: "", color: GREY, fields }], channel, items };
}

// A field per login, named with its character, holding the items to take from it first. Multiquest
// items come last, in a field of their own.
function loginFields(logins: string[], cards: Planned<Line>[]): Field[] {
  const card = (l: Planned<Line>) => `${quantity(l.qty)}${itemName(l.it)}\n-# ${spots(l.it, l.from, true)}`;
  const byLogin = logins.map(c => ({ name: c, value: cards.filter(l => l.from[0] === c).map(card).join("\n") }));
  const multi = cards.filter(l => !l.from.length);
  return [...byLogin.filter(f => f.value), ...(multi.length ? [{ name: "Multiquest", value: multi.map(card).join("\n") }] : [])];
}
type Line = { it: Item; qty: number; req: ReturnType<typeof bankRequest>; auction: boolean };
