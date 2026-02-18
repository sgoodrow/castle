import {
  AutocompleteInteraction,
  CacheType,
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import {
  openDkpService,
  odkpItemDb,
  ODKPItemHistoryEntry,
} from "../../services/openDkpService";

export class OdkpItemHistorySubcommand extends Subcommand {
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined> {
    switch (option) {
      case "item": {
        const focused = this.getOptionValue<string>("item", interaction) ?? "";
        const filter = focused.toLowerCase();
        return odkpItemDb
          .filter((i) => i.Name.toLowerCase().includes(filter))
          .slice(0, 25)
          .map((i) => ({ name: i.Name, value: i.Name }));
      }
      default:
        return;
    }
  }

  public async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void> {
    try {
      const itemName = this.getRequiredOptionValue<string>("item", interaction);
      await interaction.editReply(`Looking up history for ${itemName}...`);

      const item = await openDkpService.getItemId(itemName);
      if (!item) {
        await interaction.editReply(`Item "${itemName}" not found.`);
        return;
      }

      const history = await openDkpService.getItemHistory(item.ItemID);
      if (!history || history.length === 0) {
        await interaction.editReply(
          `No purchase history found for ${item.ItemName}.`
        );
        return;
      }

      const sorted = [...history].sort(
        (a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()
      );

      const min = history.reduce((prev, cur) =>
        cur.DkpValue < prev.DkpValue ? cur : prev
      );
      const max = history.reduce((prev, cur) =>
        cur.DkpValue > prev.DkpValue ? cur : prev
      );
      const avg =
        history.reduce((sum, entry) => sum + entry.DkpValue, 0) /
        history.length;

      const recentCount = 5;
      const recent = sorted.slice(0, recentCount);

      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      const recentLines = recent
        .map(
          (entry) =>
            `${entry.DkpValue} DKP - ${entry.CharacterName} (${formatDate(entry.Date)})`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`Item History: ${item.ItemName}`)
        .addFields(
          {
            name: "All-Time Statistics",
            value: [
              `**Min:** ${min.DkpValue} DKP (${formatDate(min.Date)}, ${min.CharacterName})`,
              `**Max:** ${max.DkpValue} DKP (${formatDate(max.Date)}, ${max.CharacterName})`,
              `**Avg:** ${Math.round(avg)} DKP`,
              `**Total purchases:** ${history.length}`,
            ].join("\n"),
          },
          {
            name: `Last ${recent.length} Purchases`,
            value: recentLines,
          }
        );

      await interaction.editReply({ content: "", embeds: [embed] });
    } catch (err: unknown) {
      await interaction.editReply(`Error: ${err}`);
    }
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName("item")
        .setDescription("Name of the item to look up")
        .setAutocomplete(true)
        .setRequired(true)
    );
    return command;
  }
}

export const odkpItemHistorySubcommand = new OdkpItemHistorySubcommand(
  "itemhistory",
  "View DKP purchase history and statistics for an item"
);
