import { ITEMS, bankRequest, prettyLoc, priceText, requestedFrom, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";

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
// Discord's fields need a name, and a field name can't hold a link. A blank name keeps the card's
// link at the top of its value.
export const BLANK = "\u200b";

// Where a banker finds it: up to six spots, then how many more as Discord's dim subtext (`-# `).
// The login route's characters come first, then the rest, each by character, then spot, so one
// character's spots sit together and a banker logs in to each character once for the whole request.
// Made-to-order jewelry is found in the bank's own tabs, and a multiquest holder isn't a spot to send to.
// `inline` puts the spots on one line, as a bullet's subtext, and says nothing when no spot holds it.
function spots(it: Item, from: string[], inline: boolean) {
  const holders = it.jewelry ? it.holders.filter(h => !h.mq) : requestedFrom(it).holders;
  if (!holders.length) return inline ? "" : "Made to order.";
  const planned = (h: Item["holders"][number]) => from.includes(h.char);
  const sorted = [...holders].sort((a, b) =>
    +planned(b) - +planned(a) || a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true }));
  const shown = sorted.slice(0, 6).map(h => `${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = sorted.length - shown.length;
  const rest = more > 0 ? [`…and ${more} more`] : [];
  return inline ? [...shown, ...rest].join(", ") : [...shown.map(s => `• ${s}`), ...rest.map(r => `-# ${r}`)].join("\n");
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

// A line's quantity, before its item, when there is more than one.
const quantity = (qty: number) => (qty > 1 ? `${qty} × ` : "");

// An item's name, linked to its P99 wiki page. The page's address can hold parentheses, which would
// end the link early, so they're written as their escapes. A name's own markdown characters, such as a
// backtick, are escaped so they can't open code or break the link around them.
const itemName = (it: Item) => {
  const name = it.name.replace(/[\\`*_~|[\]]/g, "\\$&");
  return it.wiki ? `[${name}](${it.wiki.replace(/\(/g, "%28").replace(/\)/g, "%29")})` : name;
};

// The multiquest holders of a bank item, named on its line, since players coordinate those directly
// with the holder.
const multiquest = (it: Item) => {
  const held = it.holders.filter(h => h.mq);
  return held.length ? `MQ: ${held.map(h => `${h.char}${h.count > 1 ? ` ×${h.count}` : ""}`).join(", ")}` : "";
};

// The bank post is one embed: the total, then a field per item with its linked name and price, and the
// multiquest holders under it. Where to find the items is for the banker's DM, not the post.
// Jewelry is one embed too, of linked bullets, with the bank tabs that hold each item under it.
function requestMessage(lines: Line[], total: string, channel: RequestMessage["channel"]): RequestMessage {
  const items = lines.map(l => l.it.id);
  const price = (l: Line) => `${quantity(l.qty)}${itemName(l.it)} (${priceText(l.req.price, l.qty)})`;
  if (channel === "jewelry") {
    const rows = lines.flatMap(l => {
      const where = spots(l.it, [], true);
      return [`• ${price(l)}`, ...(where ? [`-# ${where}`] : [])];
    });
    return { embeds: [{ description: [...rows, "", `**Total: ${total}**`].join("\n"), color: BLURPLE }], channel, items };
  }
  const fields = lines.map(l => ({ name: BLANK, value: [price(l), multiquest(l.it)].filter(Boolean).join(" · ") }));
  return { embeds: [{ description: `**Total: ${total}**`, color: BLURPLE, fields }], channel, items };
}
type Line = { it: Item; qty: number; req: ReturnType<typeof bankRequest>; auction: boolean };
