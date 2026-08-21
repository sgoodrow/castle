import { EmbedBuilder } from "discord.js";
import { Mutex } from "async-mutex";
import { botEmbedChannelId, raiderRoleId } from "../../config";
import { Name } from "../../db/instructions";
import { Bot } from "../../services/bot/public-accounts-sheet";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action-2";
import {
  Options,
  readyActionExecutor,
} from "../../shared/action/ready-action-2";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import moment from "moment";
import { getClassAbreviation } from "../../shared/classes";
import { log } from "../../shared/logger";
import { client, getTextChannel } from "../..";
import { HOURS } from "../../shared/time";

export const botEmbedInstructions = new InstructionsReadyAction(
  Name.BotStatusEmbed,
  botEmbedChannelId
);

// Serializes refreshes so overlapping calls (the periodic loop plus bot data
// change events) can't race and post duplicate embeds.
const refreshMutex = new Mutex();

// How often to wipe the channel of the bot's messages and reprint from scratch,
// clearing any stale embeds left behind by restarts/redeploys.
const PURGE_INTERVAL = 3 * HOURS;

// 0 forces a purge on the first refresh after startup (i.e. on restart).
let lastPurgeAt = 0;

export const updateBotEmbed = (options: Options) => {
  readyActionExecutor(async () => {
    await refreshBotEmbed();
  }, options);
};

/**
 * Deletes every message the bot has posted in the bot status channel and drops
 * the tracked instruction records, so the next print starts clean. Individual
 * deletes are used (rather than bulkDelete) so status embeds older than 14 days
 * are still removed.
 */
const purgeBotMessages = async () => {
  const meId = client.user?.id;
  if (!meId) {
    return;
  }
  const channel = await getTextChannel(botEmbedChannelId);

  let before: string | undefined;
  for (let page = 0; page < 20; page++) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) {
      break;
    }
    for (const message of batch.values()) {
      if (message.author.id === meId) {
        await message.delete().catch(() => undefined);
      }
    }
    before = batch.last()?.id;
    if (batch.size < 100) {
      break;
    }
  }

  // Drop tracking so the reprint creates fresh messages instead of trying to
  // edit the just-deleted ones.
  await botEmbedInstructions.cancelTrackedInstructions().catch(() => undefined);
  for (let i = 1; i <= MAX_OVERFLOW_MESSAGES; i++) {
    await new InstructionsReadyAction(
      `${Name.BotStatusEmbed}_${i}`,
      botEmbedChannelId
    )
      .cancelTrackedInstructions()
      .catch(() => undefined);
  }

  log("Purged bot status channel messages ahead of reprint.");
};

const truncate = (str: string, maxLength: number) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
};

// Discord embed description limit is 4096 characters.
// Use 4000 to leave room for formatting.
const MAX_EMBED_DESCRIPTION = 4000;

// Maximum number of overflow messages to manage.
const MAX_OVERFLOW_MESSAGES = 5;

export const refreshBotEmbed = async () =>
  refreshMutex.runExclusive(async () => {
    // On restart (lastPurgeAt === 0) and every few hours, wipe the bot's
    // messages and reprint so stale embeds never accumulate.
    if (Date.now() - lastPurgeAt >= PURGE_INTERVAL) {
      await purgeBotMessages().catch((reason) =>
        log(`Bot status purge failed: ${reason}`)
      );
      lastPurgeAt = Date.now();
    }
    await printBotEmbed();
  });

const printBotEmbed = async () => {
  const publicAccounts = PublicAccountsFactory.getService();
  const botMessages: string[] = [];
  let botString = "";
  const bots = await publicAccounts.getBots();

  bots.forEach((bot: Bot) => {
    let icon = "";
    const pilotName = truncate(bot.currentPilot, 10);
    if (pilotName) {
      icon = "❌";
    } else {
      if (!bot.requiredRoles?.includes(raiderRoleId as string)) {
        icon = "🛡️";
      } else {
        icon = "🟢";
      }
    }
    const botRow = `${icon} ${pilotName ? "~~" : ""} ${bot.name} (${
      bot.level
    } ${getClassAbreviation(bot.class)}) - ${bot.location} ${
      pilotName ? "~~" : ""
    } ${pilotName ? "- " + pilotName : ""}\u200B\n`;
    if (botString.length + botRow.length > MAX_EMBED_DESCRIPTION) {
      botMessages.push(botString);
      botString = "";
    }
    botString += botRow;
    // Safety: if a single row somehow exceeds the limit, flush immediately
    if (botString.length > MAX_EMBED_DESCRIPTION) {
      botMessages.push(botString);
      botString = "";
    }
  });

  if (botString) {
    botMessages.push(botString);
  }

  // Send the first message using the primary instruction action
  // Always update (even when empty) so stale data is cleared
  const primaryDescription = botMessages[0] ?? "*No bots available.*";
  await botEmbedInstructions
    .createOrUpdateInstructions({
      embeds: [
        new EmbedBuilder({
          title: `Castle bots - last updated ${moment().format("LLLL")}`,
          description: primaryDescription,
        }),
      ],
    })
    .catch((reason) => {
      log(`Embed update failed: ${reason}`);
    });

  // Send overflow messages or clean up ones that are no longer needed
  for (let i = 1; i <= MAX_OVERFLOW_MESSAGES; i++) {
    const overflowAction = new InstructionsReadyAction(
      `${Name.BotStatusEmbed}_${i}`,
      botEmbedChannelId
    );
    if (i < botMessages.length) {
      await overflowAction
        .createOrUpdateInstructions({
          embeds: [
            new EmbedBuilder({
              description: botMessages[i],
            }),
          ],
        })
        .catch((reason) => {
          log(`Overflow embed ${i} update failed: ${reason}`);
        });
    } else {
      // Delete overflow messages that are no longer needed
      await overflowAction.deleteInstructionsMessage().catch(() => {});
    }
  }
};
