import { EmbedBuilder } from "discord.js";
import { botEmbedChannelId, raiderRoleId } from "../../config";
import { Name } from "../../db/instructions";
import { Bot } from "../../services/bot/public-accounts-sheet";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action-2";
import { Options, readyActionExecutor } from "../../shared/action/ready-action-2";
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
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + "...";
};
export const refreshBotEmbed = async () => {
  const publicAccounts = PublicAccountsFactory.getService();
  let botString = "";
  const botMessages: string[] = [];
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
    } ${getClassAbreviation(bot.class)}) - ${bot.location} ${pilotName ? "~~" : ""} ${
      pilotName ? "- " + pilotName : ""
    }\u200B\n`;
    if (botString.length + botRow.length > 3000) {
      botMessages.push(botString);
      botString = "";
    }
    botString += botRow;
  });

  if (botString.length > 6000) {
    console.log(`Embed length too long (${botString.length}), 
      not attempting update`);
    return;
  }

  botMessages.push(botString);

  await botEmbedInstructions
    .createOrUpdateInstructions({
      embeds: botMessages.map((message: string, idx: number) => {
        return new EmbedBuilder({
          title: idx === 0 ? `Castle bots - last updated ${moment().toLocaleString()}` : "",
          description: message,
        });
      }),
    })
    .catch((reason) => {
      log(`Embed update failed: ${reason}`);
    });
};
