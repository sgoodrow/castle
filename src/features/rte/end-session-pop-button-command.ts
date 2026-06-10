import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ComponentType,
} from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";
import { rteService } from "../../services/rteService";
import { refreshRteStatusEmbed } from "./status-embed";
import { log } from "../../shared/logger";

export class EndRtePopButtonCommand extends ButtonCommand {
  constructor(name: string) {
    super(name);
  }

  public async execute(interaction: ButtonInteraction<CacheType>): Promise<void> {
    const sessionIdStr = interaction.customId.split("_")[3];
    const sessionId = Number.parseInt(sessionIdStr, 10);

    if (Number.isNaN(sessionId)) {
      await interaction.editReply({ content: "Invalid session ID." });
      return;
    }

    try {
      await rteService.endSessionById(sessionId, interaction.user.id, undefined, true);
      await refreshRteStatusEmbed();
      await interaction.editReply({ content: "Your session has been ended (popped). Check your DMs for a summary." });
    } catch (err: unknown) {
      log(`Failed to end RTE session (pop) ${sessionId}: ${err}`);
      await interaction.editReply({ content: `Failed to end session: ${err}` });
    }
  }

  public getButtonBuilder(sessionId: number): ButtonBuilder {
    return new ButtonBuilder()
      .setCustomId(`rte_end_pop_${sessionId}`)
      .setLabel("End Session (pop)")
      .setStyle(ButtonStyle.Danger);
  }
}

export const endRtePopButtonCommand = new EndRtePopButtonCommand("rte_end_pop");
