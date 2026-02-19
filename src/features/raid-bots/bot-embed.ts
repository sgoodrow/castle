import { EmbedBuilder } from "discord.js";
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

export const botEmbedInstructions = new InstructionsReadyAction(
  Name.BotStatusEmbed,
  botEmbedChannelId
);

export const updateBotEmbed = (options: Options) => {
  readyActionExecutor(async () => {
    await refreshBotEmbed();
  }, options);
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

export const refreshBotEmbed = async () => {
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
  });

  if (botString) {
    botMessages.push(botString);
  }

  // Send the first message using the primary instruction action
  if (botMessages.length > 0) {
    await botEmbedInstructions
      .createOrUpdateInstructions({
        embeds: [
          new EmbedBuilder({
            title: `Castle bots - last updated ${moment().toLocaleString()}`,
            description: botMessages[0],
          }),
        ],
      })
      .catch((reason) => {
        log(`Embed update failed: ${reason}`);
      });
  }

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
