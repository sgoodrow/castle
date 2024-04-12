import { 
  AutocompleteInteraction,
  CacheType, 
  CommandInteraction,
  EmbedBuilder
 } from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { bankRequestsChannelId, bankerRoleId, officerRoleId, modRoleId } from "../../../config";
import { bankData } from "../bank-data";
import { authorizeByMemberRoles } from "../../../shared/command/util";
import { autoCompleteAllItems } from "../helpers";

enum Option {
  Item = "item",
  Type = "type",
  Price = "price"
}

class SetItemData extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {

    // authorize
    authorizeByMemberRoles([
      bankerRoleId, officerRoleId, modRoleId
    ], interaction);

    const item = this.getOption(Option.Item, interaction);
    const price = this.getOption(Option.Price, interaction);

    const embed = new EmbedBuilder();

    if (!item || !price) {
      throw new Error(`An item and price is required.`); 
    } else {
      const itemData = await bankData.getItemStockById(parseInt(String(item.value)));
      if(itemData) {
        const setData = await bankData.setItemData(itemData.id, String(price.value));

        const countAvailable = itemData?.stock.reduce((total, s) => total + (s.count || 0), 0);
        embed.setTitle("UPDATED: " + itemData.name);
        embed.setDescription(
          "id: " + itemData.id
          + "\nname: " + itemData.name
          + "\ntype: " + itemData.type
          + "\nprice: " + String(price.value)
          + "\nin stock: " + countAvailable
        );
      } else {
        embed.setDescription("Item not found")
      }
      // console.log(itemData);
      interaction.editReply({
        content: "",
        embeds: [embed]
      })
    }

  }

  public get command() {
    return super.command
      .addStringOption((o) =>
      o.setName(Option.Item)
<<<<<<< HEAD
      .setDescription("Item data to set")
=======
      .setDescription("Item data to request")
>>>>>>> main
      .setRequired(true)
      .setAutocomplete(true)
      // ).addStringOption((o) =>
      // o.setName(Option.Type)
      // .setDescription("Item data to request")
      // .setRequired(true)
      // .setAutocomplete(true)
      ).addStringOption((o) =>
      o.setName(Option.Price)
<<<<<<< HEAD
      .setDescription("Set default price(s): Comma-separated list.")
=======
      .setDescription("Set default price")
>>>>>>> main
      .setRequired(true)
      .setAutocomplete(false)
    )
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction) {
    const input = interaction.options.getString('item');
    // console.log("input", input)
    switch (option) {
      case Option.Item:
        if(input && input.length > 3) {
          return await autoCompleteAllItems(input);
        } else {
          return [];
        }
    }
  }
}

export const setItem = new SetItemData(
  "set-item-data",
  "Set Item Data"
);
