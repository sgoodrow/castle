import { 
  AutocompleteInteraction, 
  CacheType, 
  CommandInteraction, 
  EmbedBuilder
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { bankData } from "../bank-data";
import { bankRequestsChannelId } from "../../../config";
import { getTextChannel } from "../../..";
import { Icon } from "../../bank-request-info/types";

enum Option {
  Item = "item"
}

class BankRequest extends Subcommand {
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
        for (let i = 0; i < stockList?.stock.length && i <= 5; i++) {
          inStock += `${stockList?.stock[i].charName}: ${stockList?.stock[i].slot} (${stockList?.stock[i].count})\n`
        };
        if(stockList?.stock.length > 10) {
          inStock += "[list truncated]"
        }
        // todo: add confirmation buttons https://discordjs.guide/message-components/interactions.html#awaiting-components
        // interaction.editReply({
        // })
        stockEmbed.setTitle(`${countAvailable} available:`)
        .setDescription(inStock);
      }


      let message = `${Icon.Request} ${interaction.user} requests:`;
      message += ` ${itemName}`;
      message += (this.getOption("count", interaction)) ? " x " + this.getOptionValue("count", interaction) : "";
      message += (this.getOption("price", interaction)) ? " for " + this.getOptionValue("price", interaction): "";
      message += (this.getOption("note", interaction)) ? " - Note: " + this.getOptionValue("note", interaction): "";



      const bankRequestsChannel = await getTextChannel(bankRequestsChannelId); 
      await bankRequestsChannel.send({
        content: message,
        embeds: [stockEmbed]
      });
      interaction.deleteReply();
    }
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o.setName(Option.Item)
      .setDescription("The item you wish to request")
      .setRequired(true)
      .setAutocomplete(true)
    ).addStringOption((o)=> 
      o.setName("count")
      .setDescription("How many?")
      .setRequired(false)
      .setAutocomplete(false)
    ).addStringOption((o)=> 
      o.setName("price")
      .setDescription("Total price.")
      .setRequired(false)
      .setAutocomplete(false)
    ).addStringOption((o)=> 
      o.setName("note")
      .setDescription("Additional comments?")
      .setRequired(false)
      .setAutocomplete(false)
    );
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction) {
    const input = interaction.options.getString('item');
    // console.log("input", input)
    switch (option) {
      case Option.Item:
        if(input && input.length > 3) {
          return await this.autoCompleteItems(input);
        } else {
          return [];
        }
      default:
        return [];
    }
  }

  private async autoCompleteItems(stem: string) {
      const items = await bankData.getItemsByStem(stem);
      // console.log("get items", items);
      if(items) {
        return items
        .filter((i) => i._count.stock > 0)
        .map((i)=>({
          name: i.name + " (" + i._count.stock +  ")",
          value: String(i.id)
        }));
      }
    return []; 
  }
}



export const bankRequest = new BankRequest(
  "request",
  "Request an item from the guild bank."
);
