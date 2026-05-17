import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { findTimerByMob } from "./helpers/timer";

class TodRemoveCommand extends SimpleCommand {
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

    await timerPrismaClient.timer.update({
      where: { id: timer.id },
      data: {
        lastTod: null,
        alertingSoon: false,
        alerted: null,
        skipCount: 0,
      },
    });

    await interaction.editReply({
      content: `Time of death removed for **${timer.name}**!`,
    });
  }
}

export const todRemoveCommand = new TodRemoveCommand("todremove", "Remove the current time of death for a registered timer", false);
