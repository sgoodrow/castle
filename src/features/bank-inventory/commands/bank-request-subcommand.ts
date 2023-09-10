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
enum Option {
  Item = "bankitem",
}

class BankRequest extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const item = this.getOption(Option.Item, interaction);
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
      await bankRequestsChannel.send({
        content: message,
        embeds: [stockEmbed]
      });
      interaction.deleteReply();
    }
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Item)
        .setDescription("The item you wish to request")
        .setRequired(true)
        .setAutocomplete(true)
    );
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction) {
    const input = interaction.options.getString('bankitem');
    console.log("input", input)
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



export const bankRequest = new BankRequest(
  "request",
  "Request an item from the guild bank."
);
