import { ITEMS, SNAPSHOT_AT, bankRequest, prettyLoc, priceText, requestedFrom, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";
import { loginRoute, type Planned } from "./route";

// One #bank-requests post for the whole tab, in the shape Discord's API takes, so the page can
// preview exactly what the bot will send. A bank tab is one embed: its summary, then a field per
// item. Jewelry can be a second embed of item cards, or one embed of linked bullets.
export interface Field { name: string; value: string }
export interface Embed { description: string; color: number; fields?: Field[] }
// Where the post goes: the bank requests channel, or the jewelry requests channel for made-to-order jewelry.
// `items` are the tab items on the post, so a post that goes through can take them off the tab.
export interface RequestMessage { embeds: Embed[]; channel: "bank" | "jewelry"; items: number[] }
export const channelName = (channel: RequestMessage["channel"]) => channel === "jewelry" ? "#jewelry-requests" : "#bank-requests";

const BLURPLE = 0x5865f2;
const GREY = 0x4e5058;
// Discord's fields need a name, and a field name can't hold a link. A blank name keeps the item's
// link at the top of its value.
export const BLANK = "​";

// The holders an item can be found at, the planned characters' spots first, then by character and
// spot (pack 2 before pack 10). Made-to-order jewelry is found in the bank's own tabs, and a multiquest
// holder isn't a spot to send to.
function holdersOf(it: Item, from: string[]) {
  const holders = it.jewelry ? it.holders.filter(h => !h.mq) : requestedFrom(it).holders;
  const planned = (h: Item["holders"][number]) => from.includes(h.char);
  return [...holders].sort((a, b) =>
    +planned(b) - +planned(a) || a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true }));
}

// A spot's name, with its count when there is more than one.
const spotText = (h: Item["holders"][number]) => `${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`;

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
// `inline` puts the spots on one line, for a bullet's subtext; otherwise each is a bullet of its own.
function spots(it: Item, from: string[], inline: boolean) {
  const sorted = holdersOf(it, from);
  if (!sorted.length) return "Made to order.";
  const shown = sorted.slice(0, 6).map(spotText);
  const more = sorted.length - shown.length;
  if (inline) return [...shown, ...(more > 0 ? [`…and ${more} more`] : [])].join(", ");
  return [...shown.map(s => `• ${s}`), ...(more > 0 ? [`-# …and ${more} more`] : [])].join("\n");
}

// A bank item's field: its name, linked and priced once. The characters the route takes it from are
// listed plainly, and the other spots dimly, so the banker's path is clear and the alternates are there.
function itemField(l: Planned<Line>): Field {
  const head = `${quantity(l.qty)}${itemName(l.it)} (${priceText(l.req.price, l.qty)})`;
  const sorted = holdersOf(l.it, l.from);
  if (!sorted.length) return { name: BLANK, value: `${head}\n-# Made to order.` };
  const shown = sorted.slice(0, 6);
  const planned = shown.filter(h => l.from.includes(h.char));
  const other = shown.filter(h => !l.from.includes(h.char)).map(spotText);
  const more = sorted.length - shown.length;
  const dim = [...other, ...(more > 0 ? [`…and ${more} more`] : [])];
  return {
    name: BLANK,
    value: [head, ...planned.map(h => `• ${spotText(h)}`), ...(dim.length ? [`-# ${dim.join(", ")}`] : [])].join("\n"),
  };
}

// How a post lists its items: one embed with a field per bank item; for jewelry, either a second embed
// of item cards or one embed of linked bullets.
type Style = "single" | "cards" | "bullets";

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
    const style: Style = channel === "jewelry" ? (picks.jewelryBullets ? "bullets" : "cards") : "single";
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
    : style === "cards" ? lines.map(l => `• ${quantity(l.qty)}${l.it.name} (${priceText(l.req.price, l.qty)})`) : [];
  // The site opens this with a line naming the member, linked to their Discord profile.
  const request: Embed = {
    description: [...rows, ...(rows.length ? [""] : []), `**Total: ${total}**`, ...(shownLogins.length ? [`-# ${shownLogins.length === 1 ? "1 login" : `${shownLogins.length} logins`}: ${shownLogins.join(", ")}`] : []), ...(style === "single" ? [`-# Inventory as of ${SNAPSHOT_AT.toLocaleString()}`] : [])].join("\n"),
    color: BLURPLE,
  };
  const items = lines.map(l => l.it.id);
  if (style === "bullets") return { embeds: [request], channel, items };
  if (style === "single") return { embeds: [{ ...request, fields: cards.map(itemField) }], channel, items };
  // Jewelry's cards: one field per item, in the order of the logins.
  const fields = cards.map(l => ({ name: BLANK, value: `${quantity(l.qty)}${itemName(l.it)}\n${spots(l.it, l.from, false)}` }));
  return { embeds: [request, { description: "", color: GREY, fields }], channel, items };
}

type Line = { it: Item; qty: number; req: ReturnType<typeof bankRequest>; auction: boolean };
