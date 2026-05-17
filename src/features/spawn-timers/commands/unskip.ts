import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { findTimerByMob } from "./helpers/timer";

class UnskipCommand extends SimpleCommand {
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

    if (!timer.lastTod) {
      await interaction.editReply({
        content: `Timer **${timer.name}** has no TOD recorded to unskip!`,
      });
      return;
    }

    if ((timer.skipCount ?? 0) <= 0) {
      await interaction.editReply({
        content: `There is no previous skip recorded to remove for **${timer.name}**!`,
      });
      return;
    }

    await timerPrismaClient.timer.update({
      where: { id: timer.id },
      data: { skipCount: (timer.skipCount ?? 0) - 1 },
    });

    await interaction.editReply({
      content: `Last skip recorded removed for **${timer.name}**! Updating window.`,
    });
  }
}

export const unskipCommand = new UnskipCommand("unskip", "Remove the last skip for a registered timer");
