// Members post their tab to #bank-requests from the bank page. The page builds the post, since it
// has the pricing rules; the server checks it fits Discord, names who sent it with a link to their
// Discord profile, and posts it as the bot with every ping turned off. Prices are the member's
// claim, as they are with /bank request, and a banker checks them before handing anything over.
import { log } from "../shared/logger";
import { requesterLine } from "../shared/bank-request-author";

const DISCORD = "https://discord.com/api/v10";

// Discord's limits for one message, with room kept for the line naming who sent it (a Discord
// display name is at most 32 characters, and the line holds the profile link too).
const REQUESTER = 160;
const MAX_EMBEDS = 10;
const MAX_DESCRIPTION = 4096;
const MAX_FIELDS = 25;
const MAX_FIELD_NAME = 256;
const MAX_FIELD_VALUE = 1024;
const MAX_FOOTER = 2048;
const MAX_TOTAL = 6000 - REQUESTER;

export interface PostField {
  name: string;
  value: string;
}

export interface PostEmbed {
  description: string;
  color: number;
  fields?: PostField[];
  footer?: string;
}

const isInt = (v: unknown): v is number => Number.isInteger(v);
const isText = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length <= max;
const isFilled = (v: unknown, max: number): v is string =>
  isText(v, max) && v.length > 0;

// A field's name and value, or null if Discord wouldn't take it.
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
    const { title, description, color, fields, footer } = (e ?? {}) as Record<
      string,
      unknown
    >;
    // The page sends no titles. The server heads the first embed with the line naming the member.
    if (title !== undefined) return null;
    // The first embed also carries that line, so it has less room left.
    const limit = out.length ? MAX_DESCRIPTION : MAX_DESCRIPTION - REQUESTER;
    if (!isText(description, limit)) return null;
    if (!isInt(color) || color < 0 || color > 0xffffff) return null;
    if (footer !== undefined && !isText(footer, MAX_FOOTER)) return null;
    if (fields !== undefined && !Array.isArray(fields)) return null;
    if (fields && fields.length > MAX_FIELDS) return null;
    const read = (fields ?? []).map(readField);
    if (read.some((f) => f === null)) return null;
    const fieldText = read.reduce(
      (n, f) => n + f!.name.length + f!.value.length,
      0
    );
    total += description.length + (footer?.length ?? 0) + fieldText;
    out.push({
      description,
      color,
      ...(fields?.length ? { fields: read as PostField[] } : {}),
      ...(footer ? { footer } : {}),
    });
  }
  return total <= MAX_TOTAL ? out : null;
}

export interface Poster {
  token: string;
  channelId: string;
}

// Posts it as the bot. False if Discord didn't take it. The first embed opens with a line naming
// who sent it, with their name linked to their profile.
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
      embeds: embeds.map((e, i) => ({
        description:
          i === 0
            ? `${requesterLine(me.id, me.name)}\n\n${e.description}`
            : e.description,
        color: e.color,
        ...(e.fields ? { fields: e.fields } : {}),
        ...(e.footer ? { footer: { text: e.footer } } : {}),
      })),
    }),
  });
  if (!res.ok)
    log(`bank web: Discord refused ${me.name}'s bank request ${res.status}`);
  return res.ok;
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
