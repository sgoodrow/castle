import { EmbedBuilder } from "discord.js";
import { raidBotsChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { characters } from "../../services/characters";
import {
  Options,
  readyActionExecutor,
} from "../../shared/action/ready-action-2";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action-2";
import { sortBy } from "lodash";
import { code } from "../../shared/util";

export const botInstructions = new InstructionsReadyAction(
  Name.BotInstructions,
  raidBotsChannelId,
  "Request Log"
);

export const updateBotsInfo = (options: Options) =>
  readyActionExecutor(async () => {
    const bots = await characters.getRaiderCharacters();
    const sorted = sortBy(
      bots,
      (b) => b.class,
      (b) => b.level
    );
    await botInstructions.createOrUpdateInstructions({
      embeds: [
        new EmbedBuilder({
          title: "Raid Bots",
          description: `Castle has several shared characters used for raiding, listed below${code}
${sorted
  .map((b) => `${b.character.padEnd(18)} ${b.class?.padEnd(12)} ${b.level}`)
  .join("\n")}${code}
❗**How do I use a bot?**
Use the \`/bot request\` command in ANY channel to receive their credentials in a DM. Messages are not allowed in this channel.

⚠️ **Note**
All credential requests are logged.`,
        }),
      ],
    });
  }, options);
