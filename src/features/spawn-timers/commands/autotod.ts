import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { findTimerByMob, hasWindow } from "./helpers/timer";

class AutotodCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("mob")
          .setDescription("Name of the mob/NPC")
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const [timers, foundTimer] = await findTimerByMob(mob);

    if (timers.length > 1 && !foundTimer) {
      await interaction.editReply({
        content: `Request returned multiple results, please be more specific:\n${timers.map((t) => `\`${t.name}\``).join("\n")}`,
      });
      return;
    }

    const timer = foundTimer ?? timers[0];
    if (!timer) {
      await interaction.editReply({
        content: `No timer registered for **${mob}**.`,
      });
      return;
    }

    if (hasWindow(timer)) {
      await interaction.editReply({
        content:
          "Auto timer only allowed on timers that do not have a window or variance!",
      });
      return;
    }

    const newAutoTod = !timer.autoTod;
    await timerPrismaClient.timer.update({
      where: { id: timer.id },
      data: { autoTod: newAutoTod },
    });

    await interaction.editReply({
      content: `Auto timer ${newAutoTod ? "enabled" : "disabled"} for **${timer.name}**!`,
    });
  }
}

export const autotodCommand = new AutotodCommand("autotod", "Enable/disable automatic TOD when a timer expires (no-window timers only)");
