import { requesterId } from "../../shared/bank-request-author";
import { Icon } from "./types";

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
