import { CacheType, CommandInteraction } from "discord.js";
// import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getBankItem } from "./bank-items";
import { bankRequestsChannelId, bankOfficeChannelId } from "../../config";

enum Option {
  Item = "bankitem",
}

class BankRequest extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    if (
      !interaction.channel ||
      interaction.channelId !== bankRequestsChannelId ||
      interaction.channelId !== bankOfficeChannelId
    ) {
      throw new Error("Must use this command in the bank request channel");
    }

    const item = this.getOption(Option.Item, interaction);
    if (!item) {
      throw new Error(`An item is required.`);
    }
    // console.log(interaction, item);
    const match = await getBankItem(String(item.value)); // this is probably a .ts hack..
    // console.log(match)
    const itemName = match.data.name;
    const instock = match.data.stock[0];
    const message = `${
      interaction.user
    } requests: ${itemName} (${match.countAvailable()}) [${
      instock.character
    }, ${instock.location}]`;

    await interaction.channel.send(message);
    interaction.editReply("Item found.");
    // interaction.editReply(`${match.countAvailable} ${match.data.name} found.`)
    // TODO: add buttons: [Request Item]  [Cancel]
    // IF no match, [Request Anyway] [Cancel]
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
