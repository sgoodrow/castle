import { Message } from "discord.js";
import { eqnotifyWatchChannelId } from "../../config";
import { eqnotifyService } from "./eqnotify.service";
import { log } from "../../shared/logger";

/**
 * Watches the batphone channel for messages (including the bot's own `/bp send`
 * posts) and dispatches EQNotify alerts to subscribers whose tags match.
 *
 * Unlike the other message actions, this must run even for bot-authored
 * messages, since castle posts batphones itself. It is therefore invoked before
 * the bot-author guard in the message-create listener.
 */
export const tryEqnotifyDispatchAction = async (message: Message) => {
  if (message.channelId !== eqnotifyWatchChannelId) {
    return;
  }
  try {
    await eqnotifyService.dispatch(message.content);
  } catch (error) {
    log(`EQNotify dispatch failed: ${error}`);
  }
};
