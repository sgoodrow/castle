import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { findTimerByMob } from "./helpers/timer";
import { timerPrismaClient } from "../../../db/timer-client";

class RegisterLinkCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("timer")
          .setDescription("Timer to link (will get auto-TOD)")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("link_to")
          .setDescription("Timer to link to (the parent)")
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const linkedMob = interaction.options.getString("timer", true).replace(/`/g, "'");
    const mob = interaction.options.getString("link_to", true).replace(/`/g, "'");

    const [, foundTimer] = await findTimerByMob(mob);
    const [, foundLinkedTimer] = await findTimerByMob(linkedMob);

    if (!foundTimer || !foundLinkedTimer) {
      await interaction.editReply({
        content: `**${mob}** or **${linkedMob}** is not a registered timer.`,
      });
      return;
    }

    if (foundLinkedTimer.linkedTimerId === null) {
      await timerPrismaClient.timer.update({
        where: { id: foundLinkedTimer.id },
        data: { linkedTimerId: foundTimer.id },
      });
      await interaction.editReply({
        content: `**${foundLinkedTimer.name}** has been linked to **${foundTimer.name}**.`,
      });
    } else {
      await timerPrismaClient.timer.update({
        where: { id: foundLinkedTimer.id },
        data: { linkedTimerId: null },
      });
      await interaction.editReply({
        content: `**${foundLinkedTimer.name}** has been unlinked from **${foundTimer.name}**.`,
      });
    }
  }
}

export const registerLinkCommand = new RegisterLinkCommand("register_link", "Link a timer to auto-set TOD when another timer's TOD is set (toggle)");
