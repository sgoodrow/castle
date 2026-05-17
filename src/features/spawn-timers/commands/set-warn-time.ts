import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { findTimerByMob } from "./helpers/timer";

class SetWarnTimeCommand extends SimpleCommand {
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
          .setName("interval")
          .setDescription('Warning interval (e.g. "20 minutes", "-1" to disable)')
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const warnTime = interaction.options.getString("interval", true).trim();

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

    await timerPrismaClient.timer.update({
      where: { id: timer.id },
      data: { warnTime },
    });

    await interaction.editReply({
      content: `Alert warn time updated for **${timer.name}**.`,
    });
  }
}

export const setWarnTimeCommand = new SetWarnTimeCommand("set_warn_time", "Set how long before a timer expires to send a warning alert. -1 disables warnings.");
