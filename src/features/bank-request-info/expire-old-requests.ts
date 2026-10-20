import { bankRequestsChannelId } from "../../config";
import { client, getTextChannel } from "../..";
import { requesterId } from "../../shared/bank-request-author";
import { log } from "../../shared/logger";
import { DAYS } from "../../shared/time";
import { Icon } from "./types";

// Requests the bot posted to #bank-requests, from the bank page or /bank request, are removed once
// they're 30 days old, and the member is sent each one by DM. Players' own posts, and
// the bot's instructions, are left alone.
export const MAX_AGE = 30 * DAYS;

export interface PostedMessage {
  id: string;
  createdTimestamp: number;
  content: string;
  author: { id: string };
  embeds: { url?: string | null; description?: string | null }[];
  delete: () => Promise<unknown>;
}

export interface RequestsChannel {
  messages: {
    fetch: (options: {
      limit: number;
      before?: string;
    }) => Promise<{ values: () => IterableIterator<PostedMessage> }>;
  };
}

// The page's request titles its first embed with the member's profile link, and lists the items
// in its description; /bank request opens with the request icon and a mention of the member.
const COMMAND = new RegExp(`^${Icon.Request} <@(\\d+)> requests:`);

// Who asked and what for, if this is a request the bot posted.
const readRequest = (m: PostedMessage, botId: string) => {
  if (m.author.id !== botId) return null;
  const embed = m.embeds[0];
  const site = embed && requesterId(embed);
  if (site) return { requester: site, text: embed.description ?? "" };
  const command = m.content.match(COMMAND)?.[1];
  return command ? { requester: command, text: m.content } : null;
};

const quote = (text: string) =>
  text
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");

// A DM holds 2,000 characters.
const MAX_DM = 2000;

export const dismissal = (text: string) =>
  `Your <Castle> bank request has been dismissed, as it was open for 30 days.

**Sorry we missed you!** Please post your bank request again the next time you are available to have it fulfilled.

${quote(text)}`.slice(0, MAX_DM);

// Deletes the expired requests, tells each member about each of theirs, and says how many. Reads
// the whole channel, newest first, a page at a time.
export const expireOldRequests = async (
  channel: RequestsChannel,
  botId: string,
  now: number,
  notify: (userId: string, text: string) => Promise<unknown>
) => {
  let removed = 0;
  let before: string | undefined;
  for (;;) {
    const page = [
      ...(await channel.messages.fetch({ limit: 100, before })).values(),
    ];
    for (const m of page) {
      const request =
        now - m.createdTimestamp >= MAX_AGE && readRequest(m, botId);
      if (!request) continue;
      await m.delete();
      removed++;
      // A member who doesn't take DMs still has theirs removed.
      await notify(request.requester, dismissal(request.text)).catch(() =>
        log(
          `bank requests: couldn't DM ${request.requester} about their removed request`
        )
      );
    }
    if (page.length < 100) return removed;
    before = page[page.length - 1].id;
  }
};

export const expireOldBankRequests = async (botId: string) => {
  const channel = await getTextChannel(bankRequestsChannelId);
  const removed = await expireOldRequests(
    channel,
    botId,
    Date.now(),
    (id, text) => client.users.send(id, text)
  );
  if (removed)
    log(`bank requests: removed ${removed} request(s) over 30 days old`);
};
