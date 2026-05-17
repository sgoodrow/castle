import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { findTimerByMob } from "./helpers/timer";

class UnregisterCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("mob")
          .setDescription("Name of the mob/NPC to unregister")
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

    if (foundTimer) {
      await timerPrismaClient.tod.deleteMany({ where: { timerId: foundTimer.id } });
      await timerPrismaClient.alias.deleteMany({ where: { timerId: foundTimer.id } });
      await timerPrismaClient.timer.delete({ where: { id: foundTimer.id } });
      await interaction.editReply({
        content: `Registered timer for [${foundTimer.name}] removed.`,
      });
    } else {
      await interaction.editReply({
        content: `No timer registered for **${mob}**.`,
      });
    }
  }
}

export const unregisterCommand = new UnregisterCommand("unregister", "Remove a previously registered timer");
