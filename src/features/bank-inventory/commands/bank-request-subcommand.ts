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
<<<<<<< HEAD
enum Option {
  Item = "bankitem",
=======
import { Icon } from "../../bank-request-info/types";
import { autoCompleteStockedItems } from "../helpers";

enum Option {
  Type = "type",
  Item = "item",
  Count = "count",
  Price = "price"
>>>>>>> bankbot-dev
}

class BankRequest extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const item = this.getOption(Option.Item, interaction);
<<<<<<< HEAD
    if (!item) {
      throw new Error(`An item is required.`);  // todo: is it?
    } else {
      const stockList = await bankData.getItemStockById(parseInt(String(item.value)));
      if (!stockList?.stock) {
        throw new Error('No matches available.')
      }
      const name = stockList?.name || 'unknown';
      // todo: check availability
      // todo: add cost?
      const count = stockList?.stock[0].count;
      const countAvailable = stockList?.stock.reduce((total, s) => total + (s.count || 0), 0);
      let inStock = ''
      for (let i = 0; i < stockList?.stock.length && i < 11; i++) {
        inStock += `${stockList?.stock[i].charName}: ${stockList?.stock[i].slot} (${stockList?.stock[i].count})\n`
      };
      if(stockList?.stock.length > 10) {
        inStock += "[list truncated]"
      }
      // todo: add confirmation buttons https://discordjs.guide/message-components/interactions.html#awaiting-components
      // interaction.editReply({
      // })

      let message = `${interaction.user} requests: ${name}`;
      const stockEmbed = new EmbedBuilder()
        .setTitle(`${countAvailable} available:`)
        .setDescription(inStock);

      const bankRequestsChannel = await getTextChannel(bankRequestsChannelId);
=======
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
>>>>>>> bankbot-dev
      await bankRequestsChannel.send({
        content: message,
        embeds: [stockEmbed]
      });
      interaction.deleteReply();
    }
  }

  public get command() {
<<<<<<< HEAD
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Item)
        .setDescription("The item you wish to request")
        .setRequired(true)
        .setAutocomplete(true)
=======
    return super.command
      .addStringOption((o) =>
      o.setName(Option.Item)
      .setDescription("The item you wish to request")
      .setRequired(true)
      .setAutocomplete(true)
    ).addStringOption((o)=> 
      o.setName("count")
      .setDescription("How many?")
      .setRequired(true)
      .setAutocomplete(true)
      .setRequired(true)
    ).addStringOption((o)=> 
      o.setName("price")
      .setDescription("Total price.")
      .setRequired(false)
      .setAutocomplete(true)
      .setRequired(true)
    ).addStringOption((o)=> 
      o.setName("note")
      .setDescription("Additional comments?")
      .setRequired(false)
      .setAutocomplete(false)
>>>>>>> bankbot-dev
    );
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction) {
<<<<<<< HEAD
    const input = interaction.options.getString('bankitem');
    console.log("input", input)
    switch (option) {
      case Option.Item:
        if(input && input.length > 3) {
          return await this.autoCompleteItems(input);
        } else {
          return [];
        }
=======
    const input = interaction.options.getString('item');
    // console.log("input", input)
    if(!input || input.length < 3) return [];
    switch (option) {
      case Option.Item:
          return await autoCompleteStockedItems(input);
      case Option.Count:
        return [{name: "1", value: "1"}];
      // add price autocomplete
      case Option.Price:
        const arr = [];
        const itemId = await interaction.options.getString(Option.Item);
        if(itemId) {
          const price = await autoCompleteItemPrice(itemId);
          if(price) {
            arr.push({
              name: price, value: price
            })
          }
        }
        return arr;
>>>>>>> bankbot-dev
      default:
        return [];
    }
  }
<<<<<<< HEAD

  private async autoCompleteItems(stem: string) {
      const items = await bankData.getItemsByStem(stem);
      console.log("get items", items);
      if(items) {
        return items.map((i)=> ({
          name: i.name,
          value: String(i.id)
        }));
      }
    return []; // temp do nothing..

  }

  protected getOptionValue<T>(
    name: string,
    interaction:
      | CommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>
  ) {
    const o = this.getOption(name, interaction);
    if (o?.value === undefined) {
      return;
    }
    return o.value as unknown as T;
  }
}

=======
}

async function autoCompleteItemPrice(itemId: string) {
  console.log(itemId);
  const itemData = await bankData.getItemStockById(parseInt(itemId));
  if(itemData && itemData.price) {
    return itemData.price;
  }
}
>>>>>>> bankbot-dev


export const bankRequest = new BankRequest(
  "request",
  "Request an item from the guild bank."
);
