import { 
  AutocompleteInteraction, 
  CacheType, 
  CommandInteraction, 
  EmbedBuilder
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { bankData } from "../bank-data";
import { autoCompleteStockedItems } from "../helpers";
enum Option {
  Item = "item"
}

class BankSearch extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const item = this.getOption(Option.Item, interaction);
    const stockEmbed = new EmbedBuilder();

    if (!item) {
      throw new Error(`An item is required.`); 
    } else {
      const stockList = await bankData.getItemStockById(parseInt(String(item.value)));
      let itemName = "unknown";
      if (!stockList?.stock || stockList?.stock.length === 0) {
        stockEmbed.setTitle("No stock found.")
        .setDescription("Item not found in current bank inventory.");
        itemName = String(this.getOptionValue("item", interaction))
      } else {
        itemName = stockList?.name || 'unknown';
        const count = stockList?.stock[0].count;
        const countAvailable = stockList?.stock.reduce((total, s) => total + (s.count || 0), 0);
        let inStock = ''
        for (let i = 0; i < stockList?.stock.length && i <= 10; i++) {
          inStock += `${stockList?.stock[i].charName}: ${stockList?.stock[i].slot} (${stockList?.stock[i].count})\n`
        };
        if(stockList?.stock.length > 10) {
          inStock += "[list truncated]"
        }
        stockEmbed.setTitle(`${countAvailable} available:`)
        .setDescription(inStock);
      }
      try {
        interaction.editReply({
          content: "",
          embeds: [stockEmbed]
        })
      } catch (e) {
        throw(e);
      }
    }
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o.setName(Option.Item)
      .setDescription("What are you looking for?")
      .setRequired(true)
      .setAutocomplete(true)
    );
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction) {
    const input = interaction.options.getString('item');
    // console.log("input", input)
    switch (option) {
      case Option.Item:
        if(input && input.length > 3) {
          return await autoCompleteStockedItems(input);
        } else {
          return [];
        }
      default:
        return [];
    }
  }
}



export const bankSearch = new BankSearch(
  "search",
  "Search for an item in the guild bank."
);
