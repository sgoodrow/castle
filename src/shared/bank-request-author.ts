import { Icon } from "../features/bank-request-info/types";

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

// /bank request opens its post with the request icon and a mention of the member.
export const commandOpening = (member: string) =>
  `${Icon.Request} ${member} requests:`;
const COMMAND = new RegExp(`^${commandOpening("<@(\\d+)>")}`);

// Who asked and what for, if a post is a bank request from the page or /bank request.
export const readBankRequest = (post: {
  content: string;
  embeds: { url?: string | null; description?: string | null }[];
}) => {
  const embed = post.embeds[0];
  const site = embed && requesterId(embed);
  if (site) return { requesterId: site, text: embed.description ?? "" };
  const command = post.content.match(COMMAND)?.[1];
  return command ? { requesterId: command, text: post.content } : null;
};
