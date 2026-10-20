// A bank request posted from the bank page is titled with its member's name, and the title links
// to their Discord profile. An embed title can't hold a mention, but the link carries their id,
// so the bot can tell who asked.
const PROFILE = /^https:\/\/discord\.com\/users\/(\d+)$/;
// Requests posted before the title change opened their description with a mention instead.
const OPENING = /^<@(\d+)> has placed a bank request\./;

export const requestTitle = (name: string) =>
  `@${name} has placed a bank request`;

export const requesterUrl = (id: string) => `https://discord.com/users/${id}`;

export const requesterId = (embed: {
  url?: string | null;
  description?: string | null;
}) =>
  embed.url?.match(PROFILE)?.[1] ??
  embed.description?.match(OPENING)?.[1] ??
  null;
