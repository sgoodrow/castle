import { ITEMS, bankRequest, prettyLoc, priceText, type ClassId, type Item } from "./data";
import type { Tab } from "./state";
import { tabTotal, totalText } from "./tab";

// One post for the whole tab, in the shape Discord's API takes, so the page can preview exactly what
// the bot will send. The site titles it with the member's name, linked to their Discord profile.
export interface Embed { description: string; color: number }
// Where the post goes: the bank requests channel, or the jewelry requests channel for made-to-order
// jewelry. `lines` are the tab's items and quantities on the post: the site plans a bank post's
// "DM me the plan" button from them, and a post that goes through takes them off the tab.
export interface RequestMessage { embeds: [Embed]; channel: "bank" | "jewelry"; lines: { id: number; qty: number }[] }
export const channelName = (channel: RequestMessage["channel"]) => channel === "jewelry" ? "#jewelry-requests" : "#bank-requests";

const BLURPLE = 0x5865f2;

// A tab's bank items and its jewelry each post to their own channel, so a mixed tab gives two posts.
export function requestMessages(tab: Tab, cls: ClassId | null): RequestMessage[] {
  const lines = Object.entries(tab).flatMap(([id, qty]) => {
    const it = ITEMS[+id];
    return it ? [{ it, qty, req: bankRequest(it, cls, qty) }] : [];
  });
  const posts = (["bank", "jewelry"] as const).map(channel => {
    const mine = lines.filter(l => (channel === "jewelry") === !!l.it.jewelry);
    const total = totalText(tabTotal(tab, cls, it => (channel === "jewelry") === !!it.jewelry));
    return mine.length ? requestMessage(mine, total, channel) : null;
  });
  return posts.filter((m): m is RequestMessage => m !== null);
}

// An item's name, linked to its P99 wiki page. The page's address can hold parentheses, which would
// end the link early, so they're written as their escapes. The name's own markdown characters, such
// as a backtick, are escaped so they can't format it or break the link around it.
const itemLink = (it: Item) => {
  const name = it.name.replace(/[\\`*_~|[\]]/g, "\\$&");
  return it.wiki ? `[${name}](${it.wiki.replace(/\(/g, "%28").replace(/\)/g, "%29")})` : name;
};

// "Cloak of Flames ×2 (1,600pp)", with the name linked: the name first, so items are easy to scan.
const priced = (l: Line) => `${itemLink(l.it)}${l.qty > 1 ? ` ×${l.qty}` : ""} (${priceText(l.req.price, l.qty)})`;

// Who holds a bank item for multiquesting: "MQ: Ringolo, Mallory ×2". Players set those up with the
// holder, so they're named on the post.
const multiquest = (it: Item) => {
  const held = it.holders.filter(h => h.mq);
  return held.length ? `MQ: ${held.map(h => `${h.char}${h.count > 1 ? ` ×${h.count}` : ""}`).join(", ")}` : null;
};

// The bank tabs that hold a piece of jewelry: up to six, then how many more. Made-to-order jewelry
// the bank holds none of has none.
const tabs = (it: Item) => {
  const holders = it.holders
    .filter(h => !h.mq)
    .sort((a, b) => a.char.localeCompare(b.char) || a.loc.localeCompare(b.loc, undefined, { numeric: true }));
  const shown = holders.slice(0, 6).map(h => `${h.char} (${prettyLoc(h.loc)})${h.count > 1 ? ` ×${h.count}` : ""}`);
  const more = holders.length - shown.length;
  return holders.length ? [...shown, ...(more > 0 ? [`…and ${more} more`] : [])].join(", ") : null;
};

// A post is one embed: a bullet per item, its linked name and price, then the total. A bank item
// names its multiquest holders; where the bank holds it is for the banker's plan, not the post. A
// piece of jewelry has the bank tabs that hold it in subtext below its bullet.
function requestMessage(lines: Line[], total: string, channel: RequestMessage["channel"]): RequestMessage {
  const rows = lines.flatMap(l => {
    if (channel === "jewelry") {
      const where = tabs(l.it);
      return [`• ${priced(l)}`, ...(where ? [`-# ${where}`] : [])];
    }
    const mq = multiquest(l.it);
    return [`• ${priced(l)}${mq ? ` · ${mq}` : ""}`];
  });
  const description = [...rows, "", `**Total: ${total}**`].join("\n");
  return { embeds: [{ description, color: BLURPLE }], channel, lines: lines.map(l => ({ id: l.it.id, qty: l.qty })) };
}
type Line = { it: Item; qty: number; req: ReturnType<typeof bankRequest> };
