import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";

class HelpCommand extends SimpleCommand {
  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const lines: string[] = [];
    lines.push("**Spawn Timer Bot Help Menu**");
    lines.push("");
    lines.push("List of available commands:");
    lines.push("```");
    lines.push(
      "/register         - Register a new timer that you want to start tracking."
    );
    lines.push(
      "/unregister       - Removes a previously registered timer."
    );
    lines.push(
      "/alias            - Adds or removes an alias on a timer."
    );
    lines.push(
      "/show             - Displays configuration about a timer."
    );
    lines.push(
      "/rename           - Renames an existing timer."
    );
    lines.push(
      "/tod              - Record a time of death for a registered timer."
    );
    lines.push(
      "/todremove        - Remove a time of death for a registered timer."
    );
    lines.push(
      "/register_link    - Link a timer to auto-set TOD when another timer TOD is set."
    );
    lines.push(
      "/register_clear   - Register a timer to be cleared when another timer's TOD is recorded."
    );
    lines.push(
      "/set_warn_time    - Adjust when the warning alert will be sent for a timer."
    );
    lines.push(
      "/todhistory       - Show last 10 TODs recorded for a registered timer."
    );
    lines.push(
      "/autotod          - Enable/disable automatic TOD when a timer expires."
    );
    lines.push(
      "/skip             - Record a skipped spawn for a registered timer."
    );
    lines.push(
      "/unskip           - Removes the last skip for a registered timer."
    );
    lines.push(
      "/timers           - See the list of timers that have been registered."
    );
    lines.push(
      "/schedule         - Outputs a human-readable schedule for the next 7 days."
    );
    lines.push(
      "/leaderboard      - Displays leaderboard of TOD by user."
    );
    lines.push(
      "/earthquake       - Resets the TOD for all timers. Warning!!!"
    );
    lines.push("```");

    await interaction.editReply({ content: lines.join("\n") });
  }
}

export const helpCommand = new HelpCommand("help", "Display the help menu with all available commands");
