import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { prismaClient } from "../../../index";
import { formatDateShort } from "./helpers/format";
import { findTimerByMob } from "./helpers/timer";

class TodHistoryCommand extends SimpleCommand {
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

    const tods = await prismaClient.tod.findMany({
      where: { timerId: timer.id },
      orderBy: { tod: "desc" },
      take: 10,
    });

    const lines: string[] = [];
    lines.push("```");
    lines.push(`Last 10 TODs for ${timer.name}:`);
    lines.push("");

    for (const todRecord of tods) {
      const todDate = new Date(todRecord.tod * 1000);
      lines.push(formatDateShort(todDate));
    }

    lines.push("```");

    await interaction.editReply({ content: lines.join("\n") });
  }
}

export const todHistoryCommand = new TodHistoryCommand("todhistory", "Show last 10 TODs recorded for a registered timer");
