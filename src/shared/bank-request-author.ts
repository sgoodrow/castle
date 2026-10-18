// A bank request posted from the bank page opens by mentioning its member. A mention in an embed
// never pings, and it carries their id, so the bot can tell who asked.
const OPENING = /^<@(\d+)> has placed a bank request\./;

export const requestOpening = (id: string) =>
  `<@${id}> has placed a bank request.`;

export const requesterId = (description: string | null | undefined) =>
  description?.match(OPENING)?.[1] ?? null;
