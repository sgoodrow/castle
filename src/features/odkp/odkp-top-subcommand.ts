import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { openDkpService } from "../../services/openDkpService";
import { raiderRoleId } from "../../config";

export class OdkpTopSubcommand extends Subcommand {
  public async getOptionAutocomplete(
    _option: string,
    _interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[]> {
    return [];
  }

  public async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void> {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(raiderRoleId))) {
      throw new Error("Must be a raider to use this command");
    }
    try {
      const count = this.getOptionValue<number>("count", interaction) ?? 15;
      const summary = await openDkpService.getDkpSummary();

      const top = summary
        .filter((c) => c.CharacterRank === "Main")
        .map((c) => ({
          ...c,
          CurrentDKP: Math.round(c.CurrentDKP * 10) / 10,
        }))
        .sort((a, b) => b.CurrentDKP - a.CurrentDKP)
        .slice(0, count);

      const description = top
        .map((c, i) => {
          const emoji = i === 0 ? "👑" :
            c.CurrentDKP > 2000 ? "👾" : c.CurrentDKP > 1000 ? "🐋" : "";
          return `${i + 1}. ${emoji} **${c.CharacterName}** (${c.CharacterClass
            }) — ${c.CurrentDKP.toFixed(1)} DKP`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`Top ${top.length} DKP Holders`)
        .setColor(0x0099ff)
        .setDescription(description || "No Main characters found.")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: unknown) {
      await interaction.editReply(`Error: ${err}`);
    }
  }

  public get command() {
    const command = super.command.addIntegerOption((o) =>
      o
        .setName("count")
        .setDescription("Number of characters to show (default 10, max 30)")
        .setMinValue(1)
        .setMaxValue(40)
    );
    return command;
  }
}

export const odkpTopSubcommand = new OdkpTopSubcommand(
  "top",
  "Shows top DKP holders",
  false
);
