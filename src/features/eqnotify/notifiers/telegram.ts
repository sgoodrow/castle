import axios from "axios";
import { TELEGRAM_BOT_TOKEN } from "../../../config";
import { log } from "../../../shared/logger";

/**
 * Whether Telegram delivery is configured (i.e. a bot token is present).
 */
export const isTelegramConfigured = () => Boolean(TELEGRAM_BOT_TOKEN);

/**
 * Delivers a message to a Telegram chat via the Bot API. `contact` is the
 * numeric chat ID of the user's conversation with the EQNotify Telegram bot.
 *
 * Note: a Telegram bot cannot initiate a conversation. The user must send the
 * EQNotify bot a message (e.g. `/start`) first, otherwise the API rejects
 * sends with `400 Bad Request: chat not found`.
 */
export const telegramPush = async (contact: string, message: string) => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error(
      "Telegram delivery is not configured (TELEGRAM_BOT_TOKEN is unset)."
    );
  }
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: contact,
        text: `EQNotify Alert\n${message}`,
      }
    );
    log(`EQNotify telegram message sent to ${contact}`);
  } catch (error) {
    const description = axios.isAxiosError(error)
      ? (error.response?.data as { description?: string } | undefined)
          ?.description
      : undefined;

    if (description?.includes("chat not found")) {
      throw new Error(
        `Telegram couldn't find chat \`${contact}\`. Open the EQNotify bot in Telegram and send it a message (e.g. \`/start\`) first, then confirm the ID is your numeric chat ID from @userinfobot.`
      );
    }
    if (description?.includes("blocked")) {
      throw new Error(
        "Telegram delivery was blocked — you've blocked the EQNotify bot. Unblock it and send it a message to resume alerts."
      );
    }
    throw new Error(
      `Telegram delivery failed${description ? `: ${description}` : "."}`
    );
  }
};
