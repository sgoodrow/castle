import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";
import { findTimerByMob } from "./helpers/timer";

class AliasCommand extends SimpleCommand {
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
          .setName("alias")
          .setDescription("The alias to add or remove")
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const aliasValue = interaction.options.getString("alias", true).trim();

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

    // Check if alias already exists - toggle it
    const existingAlias = await timerPrismaClient.alias.findFirst({
      where: { timerId: timer.id, name: aliasValue },
    });

    if (existingAlias) {
      await timerPrismaClient.alias.delete({ where: { id: existingAlias.id } });
      await interaction.editReply({
        content: `Alias of **${aliasValue}** removed from timer **${timer.name}**!`,
      });
    } else {
      await timerPrismaClient.alias.create({
        data: { timerId: timer.id, name: aliasValue },
      });
      await interaction.editReply({
        content: `Alias of **${aliasValue}** added to timer **${timer.name}**!`,
      });
    }
  }
}

export const aliasCommand = new AliasCommand("alias", "Add or remove an alias on a timer", false);
