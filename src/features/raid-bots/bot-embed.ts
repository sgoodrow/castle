import { APIEmbed, EmbedBuilder, Utils } from "discord.js";
import { botEmbedChannelId, knightRoleId, raiderRoleId } from "../../config";
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

export const botEmbedInstructions = new InstructionsReadyAction(
  Name.BotStatusEmbed,
  botEmbedChannelId
);

export const updateBotEmbed = (options: Options) => {
  readyActionExecutor(async () => {
    await refreshBotEmbed();
  }, options);
};
export const refreshBotEmbed = async () => {
  const publicAccounts = PublicAccountsFactory.getService();
  let botString = "";
  const botMessages: string[] = [];
  const start = moment.now();
  const bots = await publicAccounts.getBots();

  bots.forEach((bot: Bot) => {
    let icon = "";
    if (bot.currentPilot) {
      icon = "❌";
    } else {
      if (!bot.requiredRoles?.includes(raiderRoleId as string)) {
        icon = "🛡️";
      } else {
        icon = "🟢";
      }
    }
    const botRow = `${icon} ${bot.currentPilot ? "~~" : ""} ${bot.name} (${
      bot.level
    } ${getClassAbreviation(bot.class)}) - ${bot.location} ${
      bot.currentPilot ? "~~" : ""
    } ${bot.currentPilot ? "- " + bot.currentPilot : ""}\u200B\n`;
    if (botString.length + botRow.length > 3000) {
      botMessages.push(botString);
      botString = "";
    }
    botString += botRow;
  });

  botMessages.push(botString);

  await botEmbedInstructions
    .createOrUpdateInstructions({
      embeds: botMessages.map((message: string, idx: number) => {
        return new EmbedBuilder({
          title:
            idx === 0
              ? `Castle bots - last updated ${moment().toLocaleString()}`
              : "",
          description: message,
        });
      }),
    })
    .catch((reason) => {
      console.log("Embed update failed: " + reason);
    });
};
