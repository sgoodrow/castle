import { CacheType, CommandInteraction } from "discord.js";
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
    console.log(match)
    let text = "Sending inventory...";
    // todo: figure out these fancy "embed" replies.
    // match.items.forEach((obj: inventoryItem)=>{
    //   console.log(obj)
    //   text.concat(Object.values(obj).join("") + "/r")
    // })
    interaction.editReply(text)
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
