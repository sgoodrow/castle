import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";

class TodMissingCommand extends SimpleCommand {
  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const timers = await timerPrismaClient.timer.findMany({
      where: { lastTod: null },
      orderBy: { name: "asc" },
    });

    const names = timers.map((t) => t.name);

    const timersString =
      names.length > 0 ? names.join("\n") : "No missing timers.";

    const content =
      timersString.length > 1950
        ? timersString.slice(0, 1947) + "..."
        : timersString;

    const lines: string[] = [];
    lines.push("```");
    lines.push("Timers without an active TOD:");
    lines.push("");
    lines.push(content);
    lines.push("```");

    await interaction.editReply({ content: lines.join("\n") });
  }
}

export const todMissingCommand = new TodMissingCommand("todmissing", "List mobs that don't have an active timer recorded", false);
