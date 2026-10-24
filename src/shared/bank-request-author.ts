// A bank request posted from the bank page opens with a line naming its member, with their name
// linked to their Discord profile. The link carries their id, so the bot can tell who asked.
// Older posts titled the embed with that line instead, and still count.
const PROFILE = /^https:\/\/discord\.com\/users\/(\d+)$/;
const GREETING =
  /^\[@[^\]]*\]\(https:\/\/discord\.com\/users\/(\d+)\) has placed a bank request\./;
// Requests posted before the title change opened their description with a mention instead.
const OPENING = /^<@(\d+)> has placed a bank request\./;

// Brackets would end the link's text early, and a backslash would escape its closing bracket. Other markdown
// characters would format the name, so they're dropped too.
export const requesterLine = (id: string, name: string) =>
  `[@${name.replace(/[[\]\\\r\n*_~|`<>]/g, "")}](https://discord.com/users/${id}) has placed a bank request.`;

// The request itself, without the line that names its member.
export const requestBody = (description: string) =>
  GREETING.test(description)
    ? description.replace(/^[^\n]*\n\n/, "")
    : description;

export const requesterId = (embed: {
  url?: string | null;
  description?: string | null;
}) =>
  embed.url?.match(PROFILE)?.[1] ??
  embed.description?.match(GREETING)?.[1] ??
  embed.description?.match(OPENING)?.[1] ??
  null;
