import { bankRequestsChannelId } from "../../config";
import { getTextChannel } from "../..";
import { requesterId } from "../../shared/bank-request-author";
import { log } from "../../shared/logger";
import { DAYS } from "../../shared/time";
import { Icon } from "./types";

// Requests the bot posted to #bank-requests, from the bank page or /bank request, are removed once
// they're 30 days old. Players' own posts, and the bot's instructions, are left alone.
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

// The page's request titles its first embed with the member's profile link; /bank request opens
// with the request icon and a mention of the member.
const COMMAND = new RegExp(`^${Icon.Request} <@\\d+> requests:`);

const isBotRequest = (m: PostedMessage, botId: string) =>
  m.author.id === botId &&
  ((m.embeds[0] && requesterId(m.embeds[0]) != null) || COMMAND.test(m.content));

// Deletes the expired requests and says how many. Reads the whole channel, newest first, a page at
// a time.
export const expireOldRequests = async (
  channel: RequestsChannel,
  botId: string,
  now: number
) => {
  let removed = 0;
  let before: string | undefined;
  for (;;) {
    const page = [...(await channel.messages.fetch({ limit: 100, before })).values()];
    for (const m of page) {
      if (now - m.createdTimestamp >= MAX_AGE && isBotRequest(m, botId)) {
        await m.delete();
        removed++;
      }
    }
    if (page.length < 100) return removed;
    before = page[page.length - 1].id;
  }
};

export const expireOldBankRequests = async (botId: string) => {
  const channel = await getTextChannel(bankRequestsChannelId);
  const removed = await expireOldRequests(channel, botId, Date.now());
  if (removed)
    log(`bank requests: removed ${removed} request(s) over 30 days old`);
};
