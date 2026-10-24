import { requestBody, requesterId } from "../../shared/bank-request-author";
import { Icon } from "./types";

// /bank request opens its post with the request icon and a mention of the member.
export const commandOpening = (member: string) =>
  `${Icon.Request} ${member} requests:`;
const COMMAND = new RegExp(`^${commandOpening("<@(\\d+)>")}`);

// Who asked and what for, if a post is a bank request from the page or /bank request.
export const readBankRequest = (post: {
  content: string;
  embeds: {
    url?: string | null;
    title?: string | null;
    description?: string | null;
    fields: { value: string }[];
  }[];
}) => {
  const embed = post.embeds[0];
  const site = embed && requesterId(embed);
  // A page request's items are its embeds' fields, so the text quotes them after the total. A page from before
  // titles named members has a card per item, titled with the item's name, so the card's title is quoted too.
  if (site)
    return {
      requesterId: site,
      text: [
        requestBody(embed.description ?? ""),
        ...post.embeds
          .slice(1)
          .map(e => [e.title, e.description].filter(Boolean).join("\n")),
        ...post.embeds.flatMap(e => e.fields.map(f => f.value)),
      ]
        .filter((t): t is string => !!t)
        .join("\n"),
    };
  const command = post.content.match(COMMAND)?.[1];
  return command ? { requesterId: command, text: post.content } : null;
};
