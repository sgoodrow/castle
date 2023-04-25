import { CacheType, CommandInteraction, EmbedBuilder } from "discord.js";
// import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getBankItem, getItemsSet } from "./bank-items";
import { bankRequestsChannelId, bankOfficeChannelId } from "../../config";
import { getTextChannel } from "../..";
enum Option {
  Item = "bankitem",
}

class ItemStock extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const query = this.getOption(Option.Item, interaction);
    if (!query) {
      throw new Error(`An item is required.`);
    }
    // console.log(interaction, item);
    const item = await getBankItem(String(query.value));
    // console.log(item.data, item.countAvailable)

    let description = `${item.countAvailable} in stock. \n\n`;

    item.data.stock.forEach((val) => {
      description += `${val.character} (${val.count}) [${val.location}] \n`;
    });

    const embed = new EmbedBuilder({
      title: `Item: ${item.data.name}`,
      description: description,
    });

    interaction.channel?.send({ embeds: [embed] });
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

  public async getOptionAutocomplete(option: string) {
    if (option === Option.Item) {
      return await this.autoCompleteItems();
    }
  }

  private async autoCompleteItems() {
    const itemsSet = await getItemsSet();
    return itemsSet.map((s) => ({
      name: s,
      value: s,
    }));
  }
}

export const itemStock = new ItemStock(
  "item",
  "Request item stock information."
);
