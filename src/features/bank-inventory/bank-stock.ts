import { CacheType, CommandInteraction, EmbedBuilder } from "discord.js";
// import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getBankItem } from "./bank-items";
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
    console.log(item.data, item.getCountAvailable())

    let description = `${item.getCountAvailable()} in stock. \n\n`
    
    item.data.stock.forEach((val) => {
      description += `${val.character} (${val.count}) [${val.location}] \n`
    })

    const embed = new EmbedBuilder({
      title: `Item: ${item.data.name}`,
      description: description
    });

 

    interaction.channel?.send({ embeds: [embed]})  
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Item)
        .setDescription("The item you wish to request")
        .setRequired(true)
    );
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const itemStock = new ItemStock (
  "item",
  "Request item stock information."
);
