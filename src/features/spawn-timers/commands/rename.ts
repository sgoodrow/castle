import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";

class RenameCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("mob")
          .setDescription("Current name of the mob/NPC")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("new_name")
          .setDescription("New name for the timer")
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true);
    const newName = interaction.options.getString("new_name", true).replace(/`/g, "'");

    const timer = await timerPrismaClient.timer.findFirst({
      where: { name: { equals: mob, mode: "insensitive" } },
    });

    if (!timer) {
      await interaction.editReply({
        content: `No timer registered for **${mob}**.`,
      });
      return;
    }

    await timerPrismaClient.timer.update({
      where: { id: timer.id },
      data: { name: newName },
    });

    await interaction.editReply({
      content: `Timer for **${mob}** has been renamed to **${newName}**.`,
    });
  }
}

export const renameCommand = new RenameCommand("rename", "Rename an existing timer");
