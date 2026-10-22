import { Message } from "discord.js";
import { bankRequestsChannelId, jewelryChannelId } from "../../config";
import { client, getTextChannel } from "../..";
import {
  Options,
  readyActionExecutor,
} from "../../shared/action/ready-action-2";
import { readBankRequest } from "./bank-request";
import { channelMessages, MessageSource } from "../../shared/channel-messages";
import { log } from "../../shared/logger";
import { DAYS } from "../../shared/time";
import { dismissal } from "./dismissal";

// Requests the bot posted to #bank-requests and #jewelry-requests, from the bank page or /bank request,
// are removed once they're 30 days old, and the member is sent each one by DM. Players' own posts,
// and the bot's instructions, are left alone.
export const MAX_AGE_DAYS = 30;

type Post = Pick<
  Message,
  "id" | "createdTimestamp" | "content" | "author" | "embeds" | "delete"
>;

// Deletes the expired requests, tells each member about each of theirs, and says how many.
export const expireOldRequests = async (
  channel: MessageSource<Post>,
  botId: string,
  now: number,
  notify: (userId: string, text: string) => Promise<unknown>,
  what = "bank request"
) => {
  let removed = 0;
  for await (const m of channelMessages(channel)) {
    if (m.author.id !== botId) continue;
    if (now - m.createdTimestamp < MAX_AGE_DAYS * DAYS) continue;
    const request = readBankRequest(m);
    if (!request) continue;
    // A banker may have filled or cancelled it since the page was read.
    if (
      !(await m.delete().then(
        () => true,
        () => false
      ))
    )
      continue;
    removed++;
    // A member who doesn't take DMs still has theirs removed.
    await notify(
      request.requesterId,
      dismissal(
        [request.text],
        `, as it was open for ${MAX_AGE_DAYS} days`,
        what
      )
    ).catch(() =>
      log(
        `bank requests: couldn't DM ${request.requesterId} about their removed request`
      )
    );
  }
  return removed;
};

export const expireOldBankRequests = (options: Options) => {
  readyActionExecutor(refreshBankRequests, options);
};

const refreshBankRequests = async () => {
  const botId = client.user?.id;
  if (!botId) return;
  // Jewelry the bot posts expires the same way bank requests do. Members' typed jewelry requests
  // are left to the jewelers.
  let removed = 0;
  for (const [channelId, what] of [
    [bankRequestsChannelId, "bank request"],
    [jewelryChannelId, "jewelry request"],
  ] as const) {
    const channel = await getTextChannel(channelId);
    removed += await expireOldRequests(
      channel,
      botId,
      Date.now(),
      (id, text) => client.users.send(id, text),
      what
    );
  }
  if (removed)
    log(
      `bank requests: removed ${removed} request(s) over ${MAX_AGE_DAYS} days old`
    );
};
