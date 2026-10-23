// A bank request posted from the bank page opens with a line naming its member, with their name
// linked to their Discord profile. The link carries their id, so the bot can tell who asked.
// Older posts titled the embed with that line instead, and still count.
const PROFILE = /^https:\/\/discord\.com\/users\/(\d+)$/;
const LINE =
  /^\[@[^\]]*\]\(https:\/\/discord\.com\/users\/(\d+)\) has placed a bank request\./;
// Requests posted before the title change opened their description with a mention instead.
const OPENING = /^<@(\d+)> has placed a bank request\./;

// Brackets would end the link's text early.
export const requesterLine = (id: string, name: string) =>
  `[@${name.replace(/[[\]]/g, "")}](https://discord.com/users/${id}) has placed a bank request.`;

export const requesterId = (embed: {
  url?: string | null;
  description?: string | null;
}) =>
  embed.url?.match(PROFILE)?.[1] ??
  embed.description?.match(LINE)?.[1] ??
  embed.description?.match(OPENING)?.[1] ??
  null;
