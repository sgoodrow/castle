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
 */
export const telegramPush = async (contact: string, message: string) => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error(
      "Telegram delivery is not configured (TELEGRAM_BOT_TOKEN is unset)."
    );
  }
  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: contact,
      text: `EQNotify Alert\n${message}`,
    }
  );
  log(`EQNotify telegram message sent to ${contact}`);
};
