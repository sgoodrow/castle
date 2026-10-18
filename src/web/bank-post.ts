// Members post their tab to #bank-requests from the bank page. The page builds the post, since it
// has the pricing rules; the server checks it fits Discord, titles it with the member's name, and
// posts it as the bot with every ping turned off. Prices are the member's claim, as they are
// with /bank request, and a banker checks them before handing anything over.
import { log } from "../shared/logger";
import { requestTitle, requesterUrl } from "../shared/bank-request-author";

const DISCORD = "https://discord.com/api/v10";

// Discord's limits for one message, with room kept for the title the server puts on the first
// embed (a Discord display name is at most 32 characters).
const TITLE = 64;
const MAX_EMBEDS = 10;
const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4096;
const MAX_FOOTER = 2048;
const MAX_TOTAL = 6000 - TITLE;

export interface PostEmbed {
  title: string;
  description: string;
  color: number;
  item?: number; // whose icon goes in the corner
  footer?: string;
}

const isInt = (v: unknown): v is number => Number.isInteger(v);
const isText = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;

// The page's post, or null if it isn't one Discord would take.
export function readPost(body: unknown): PostEmbed[] | null {
  const embeds = (body as { embeds?: unknown } | null)?.embeds;
  if (!Array.isArray(embeds) || !embeds.length || embeds.length > MAX_EMBEDS)
    return null;
  const out: PostEmbed[] = [];
  let total = 0;
  for (const e of embeds as unknown[]) {
    const { title, description, color, item, footer } = (e ?? {}) as Record<
      string,
      unknown
    >;
    if (!isText(title, MAX_TITLE) || !title) return null;
    if (!isText(description, MAX_DESCRIPTION)) return null;
    if (!isInt(color) || color < 0 || color > 0xffffff) return null;
    if (item !== undefined && !(isInt(item) && item > 0)) return null;
    if (footer !== undefined && !isText(footer, MAX_FOOTER)) return null;
    total += title.length + description.length + (footer?.length ?? 0);
    out.push({
      title,
      description,
      color,
      ...(item !== undefined ? { item } : {}),
      ...(footer ? { footer } : {}),
    });
  }
  return total <= MAX_TOTAL ? out : null;
}

export interface Poster {
  token: string;
  channelId: string;
  baseUrl: string; // where Discord fetches item icons from
  icon: (item: number) => number | null | undefined;
}

// Posts it as the bot. False if Discord didn't take it.
export async function postRequest(
  p: Poster,
  me: { id: string; name: string },
  embeds: PostEmbed[]
) {
  const res = await fetch(`${DISCORD}/channels/${p.channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${p.token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      embeds: embeds.map((e, i) => {
        const icon = e.item != null ? p.icon(e.item) : undefined;
        return {
          ...(i === 0
            ? { title: requestTitle(me.name), url: requesterUrl(me.id) }
            : { title: e.title }),
          description: e.description,
          color: e.color,
          ...(e.footer ? { footer: { text: e.footer } } : {}),
          ...(icon != null
            ? { thumbnail: { url: `${p.baseUrl}/icons/${icon}.png` } }
            : {}),
        };
      }),
    }),
  });
  if (!res.ok)
    log(`bank web: Discord refused ${me.name}'s bank request ${res.status}`);
  return res.ok;
}
