import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { buildShowMessage } from "./helpers/message";
import { findTimerByMob } from "./helpers/timer";

class ShowCommand extends SimpleCommand {
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

    const msg = await buildShowMessage(timer);
    await interaction.editReply({ content: msg });
  }
}

export const showCommand = new ShowCommand("show", "Display configuration about a timer", false);
