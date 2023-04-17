import { CacheType, CommandInteraction, MessageEmbed } from "discord.js";
// import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getBankerInventory, inventoryItem } from "./bank-items";

enum Option {
  Banker = "banker"
}

class BankerInventory extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const banker = this.getOption(Option.Banker, interaction);
    if (!banker) {
      throw new Error(`A banker name required.`);
    }
    console.log(interaction, banker);
    const match = await getBankerInventory(String(banker.value));
    let text = "Inventories are too big.. coming soon.";
    interaction.editReply(text)
    const inventoryText = match.items.reduce((text: string, item: inventoryItem) => {
      console.log(item)
      return text + `${item.name} (${item.count}) [${item.location}] \n`;
    })
    console.log(inventoryText)
    const embed = new MessageEmbed({
      title: `${banker.value} Inventory`,
      description: inventoryText
    })
    // interaction.channel?.send({ embeds: [embed]})  // these are too big..
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Banker)
          .setDescription("The banker inventory you wish to see")
          .setRequired(true)
      )
  }

  public async getOptionAutocomplete() {
    return [];
  }
}

export const bankerInventory = new BankerInventory("inventory", "Request the inventory for a banker from the build bank.");
