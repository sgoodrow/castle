import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { prismaClient } from "../../../index";

class UnlinkCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("mob")
          .setDescription("Name of the timer to remove the link from")
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");

    const timer = await prismaClient.timer.findFirst({
      where: { name: { equals: mob, mode: "insensitive" } },
    });

    if (!timer) {
      await interaction.editReply({
        content: `**${mob}** is not a registered timer.`,
      });
      return;
    }

    if (!timer.linkedTimerId) {
      await interaction.editReply({
        content: `**${timer.name}** does not have a linked timer.`,
      });
      return;
    }

    const linkedTimer = await prismaClient.timer.findUnique({
      where: { id: timer.linkedTimerId },
    });

    await prismaClient.timer.update({
      where: { id: timer.id },
      data: { linkedTimerId: null },
    });

    await interaction.editReply({
      content: `Link for **${mob}** to **${linkedTimer?.name ?? "unknown"}** has been removed.`,
    });
  }
}

export const unlinkCommand = new UnlinkCommand("unlink", "Remove a link from a timer");
