import { CacheType, CommandInteraction } from "discord.js";
// import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getBankItem } from "./bank-items";
import { bankRequestsChannelId, bankOfficeChannelId } from "../../config";
import { getTextChannel } from "../..";
enum Option {
  Item = "bankitem",
}

class BankRequest extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {


    const item = this.getOption(Option.Item, interaction);
    if (!item) {
      throw new Error(`An item is required.`);
    }
    // console.log(interaction, item);
    const match = await getBankItem(String(item.value));
    console.log(match)
    const itemName = match.data.name;
    const instock = match.data.stock[0];
    if (!instock) {
      throw new Error(`${itemName} is not in stock.`); // not sure if we should allow it anyway. maybe?
    }
    const message = `${
      interaction.user
    } requests: ${itemName} (${instock.count}/${match.getCountAvailable()}) [${
      instock.character
    }, ${instock.location}]`;

    const bankRequestsChannel = await getTextChannel(bankRequestsChannelId);
    await bankRequestsChannel.send(message);
    interaction.editReply("Item found, creating request.")
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

export const bankRequest = new BankRequest(
  "request",
  "Request an item from the build bank."
);
