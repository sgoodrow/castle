import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { findTimerByMob } from "./helpers/timer";
import { prismaClient } from "../../../index";

class RegisterClearCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("timer_to_clear")
          .setDescription("Timer that will be cleared")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("trigger_timer")
          .setDescription("Timer whose TOD triggers the clear")
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const mob = interaction.options
      .getString("timer_to_clear", true)
      .replace(/`/g, "'");
    const parentMob = interaction.options
      .getString("trigger_timer", true)
      .replace(/`/g, "'");

    const [, foundTimer] = await findTimerByMob(mob);
    const [, parentTimer] = await findTimerByMob(parentMob);

    if (!foundTimer || !parentTimer) {
      await interaction.editReply({
        content: `**${mob}** or **${parentMob}** is not a registered timer.`,
      });
      return;
    }

    if (foundTimer.clearParentTimerId === null) {
      await prismaClient.timer.update({
        where: { id: foundTimer.id },
        data: { clearParentTimerId: parentTimer.id },
      });
      await interaction.editReply({
        content: `**${foundTimer.name}** will be cleared on tod of **${parentTimer.name}**.`,
      });
    } else {
      await prismaClient.timer.update({
        where: { id: foundTimer.id },
        data: { clearParentTimerId: null },
      });
      await interaction.editReply({
        content: `**${foundTimer.name}** will no longer be cleared on tod of **${parentTimer.name}**.`,
      });
    }
  }
}

export const registerClearCommand = new RegisterClearCommand("register_clear", "Register/unregister a timer to be cleared when another timer's TOD is recorded (toggle)");
