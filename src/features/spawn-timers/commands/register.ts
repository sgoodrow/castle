import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { parseDuration } from "./helpers/duration";
import { buildShowMessage } from "./helpers/message";

class RegisterCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("mob")
          .setDescription("Name of the mob/NPC")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("window_start")
          .setDescription('Respawn time or window start (e.g. "1 day", "18 hours")')
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("window_end")
          .setDescription('Window end time (e.g. "7 days")')
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("variance")
          .setDescription('Variance/jitter (e.g. "8 hours", "10 minutes")')
          .setRequired(false)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const windowStart = interaction.options.getString("window_start", true).trim();
    const windowEnd = interaction.options.getString("window_end")?.trim() ?? null;
    const variance = interaction.options.getString("variance")?.trim() ?? null;

    // Validate formats
    if (!windowStart.match(/^\d/) || parseDuration(windowStart) === null) {
      await interaction.editReply({
        content: `Window Start/Spawn time [${windowStart}] is an invalid format. Please use something like '8 hours' or '6 minutes'.`,
      });
      return;
    }

    if (windowEnd && (!windowEnd.match(/^\d/) || parseDuration(windowEnd) === null)) {
      await interaction.editReply({
        content: `Window End [${windowEnd}] is an invalid format. Please use something like '8 hours' or '6 minutes'.`,
      });
      return;
    }

    if (variance && (!variance.match(/^\d/) || parseDuration(variance) === null)) {
      await interaction.editReply({
        content: `Variance [${variance}] is an invalid format. Please use something like '8 hours' or '6 minutes'.`,
      });
      return;
    }

    // Upsert the timer
    let timer = await timerPrismaClient.timer.findFirst({
      where: { name: { equals: mob, mode: "insensitive" } },
    });

    if (timer) {
      timer = await timerPrismaClient.timer.update({
        where: { id: timer.id },
        data: {
          name: mob,
          windowStart,
          windowEnd,
          variance,
          skipCount: 0,
        },
      });
    } else {
      timer = await timerPrismaClient.timer.create({
        data: {
          name: mob,
          windowStart,
          windowEnd,
          variance,
          skipCount: 0,
        },
      });
    }

    let windowDesc = windowEnd
      ? `with window between ${windowStart} and ${windowEnd}`
      : `with respawn time of ${windowStart}`;

    if (variance) {
      windowDesc += ` with variance of ${variance}`;
    }

    const showMsg = await buildShowMessage(timer);
    await interaction.editReply({
      content: `Timer for **${mob}** ${windowDesc} registered!\n${showMsg}`,
    });
  }
}

export const registerCommand = new RegisterCommand("register", "Register a new spawn timer to track");
