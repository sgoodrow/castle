// Members post their tab to #bank-requests from the bank page. The page builds the post, since it
// has the pricing rules; the server checks it fits Discord, titles it with the member's name, adds
// the "DM me the plan" button to a bank post, and posts it as the bot with every ping turned off.
// Prices are the member's claim, as they are with /bank request, and a banker checks them before
// handing anything over.
import { log } from "../shared/logger";
import { requestTitle, requesterUrl } from "../shared/bank-request-author";
import { PLAN_LABEL } from "../shared/bank-plan-id";

const DISCORD = "https://discord.com/api/v10";

// Discord's limits for one message, with room kept for the title the server puts on the first
// embed (a Discord display name is at most 32 characters).
const TITLE = 64;
const MAX_EMBEDS = 10;
const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4096;
const MAX_FIELDS = 25;
const MAX_FIELD_NAME = 256;
const MAX_FIELD_VALUE = 1024;
const MAX_FOOTER = 2048;
const MAX_TOTAL = 6000 - TITLE;

export interface PostField {
  name: string;
  value: string;
}

// The page posts one embed, with a field per item. A page opened before that change still posts an
// embed per item, titled and with the item's icon, and still gets through.
export interface PostEmbed {
  title?: string;
  description: string;
  color: number;
  fields?: PostField[];
  item?: number; // whose icon goes in the corner
  footer?: string;
}

const isInt = (v: unknown): v is number => Number.isInteger(v);
const isText = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;
// Discord refuses a field name or value that's only whitespace.
const isFilled = (v: unknown, max: number): v is string =>
  isText(v, max) && v.trim().length > 0;

// A field, or null if Discord wouldn't take it.
const readField = (f: unknown): PostField | null => {
  const { name, value } = (f ?? {}) as Record<string, unknown>;
  return isFilled(name, MAX_FIELD_NAME) && isFilled(value, MAX_FIELD_VALUE)
    ? { name, value }
    : null;
};

// The page's post, or null if it isn't one Discord would take.
export function readPost(body: unknown): PostEmbed[] | null {
  const embeds = (body as { embeds?: unknown } | null)?.embeds;
  if (!Array.isArray(embeds) || !embeds.length || embeds.length > MAX_EMBEDS)
    return null;
  const out: PostEmbed[] = [];
  let total = 0;
  for (const e of embeds as unknown[]) {
    const { title, description, color, fields, item, footer } = (e ??
      {}) as Record<string, unknown>;
    if (title !== undefined && !isText(title, MAX_TITLE)) return null;
    // Every entry the bank page posts has text, and Discord refuses an entry with none.
    if (!isFilled(description, MAX_DESCRIPTION)) return null;
    if (!isInt(color) || color < 0 || color > 0xffffff) return null;
    if (fields !== undefined && !Array.isArray(fields)) return null;
    if (fields && fields.length > MAX_FIELDS) return null;
    if (item !== undefined && !(isInt(item) && item > 0)) return null;
    if (footer !== undefined && !isText(footer, MAX_FOOTER)) return null;
    const read: PostField[] = [];
    for (const f of (fields ?? []) as unknown[]) {
      const field = readField(f);
      if (!field) return null;
      read.push(field);
    }
    total +=
      (title?.length ?? 0) +
      description.length +
      (footer?.length ?? 0) +
      read.reduce((n, f) => n + f.name.length + f.value.length, 0);
    out.push({
      ...(title ? { title } : {}),
      description,
      color,
      ...(read.length ? { fields: read } : {}),
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

// Says a plain message in a channel as the bot. Throws if Discord doesn't take it.
export async function postToChannel(
  token: string,
  channelId: string,
  content: string
) {
  const res = await fetch(`${DISCORD}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) throw new Error(`Discord answered ${res.status}`);
}

// Posts it as the bot. False if Discord didn't take it. The first embed is titled with the member's
// name, linked to their Discord profile. With a plan, the post has the "DM me the plan" button.
export async function postRequest(
  p: Poster,
  me: { id: string; name: string },
  embeds: PostEmbed[],
  plan: string | null
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
          // The first entry's title is the server's. JSON leaves out what's undefined.
          title: i === 0 ? requestTitle(me.name) : e.title,
          url: i === 0 ? requesterUrl(me.id) : undefined,
          description: e.description,
          color: e.color,
          ...(e.fields ? { fields: e.fields } : {}),
          ...(e.footer ? { footer: { text: e.footer } } : {}),
          ...(icon != null
            ? { thumbnail: { url: `${p.baseUrl}/icons/${icon}.png` } }
            : {}),
        };
      }),
      ...(plan
        ? {
            components: [
              {
                type: 1, // a row
                components: [
                  {
                    type: 2, // a button
                    style: 2, // grey
                    label: PLAN_LABEL,
                    custom_id: plan,
                  },
                ],
              },
            ],
          }
        : {}),
    }),
  });
  if (!res.ok)
    log(`bank web: Discord refused ${me.name}'s bank request ${res.status}`);
  return res.ok;
}
