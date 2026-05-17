import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { timerPrismaClient } from "../../../db/timer-client";

class TimersCommand extends SimpleCommand {
  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const timers = await timerPrismaClient.timer.findMany({
      where: { name: { not: "" } },
      orderBy: { name: "asc" },
    });

    const names = timers.map((t) => t.name);

    const timersString =
      names.length > 0 ? names.join("\n") : "No timers registered.";

    const content =
      timersString.length > 1950
        ? timersString.slice(0, 1947) + "..."
        : timersString;

    const lines: string[] = [];
    lines.push("```");
    lines.push("Currently registered timers:");
    lines.push("");
    lines.push(content);
    lines.push("```");

    await interaction.editReply({ content: lines.join("\n") });
  }
}

export const timersCommand = new TimersCommand("timers", "List all registered timers", false);
