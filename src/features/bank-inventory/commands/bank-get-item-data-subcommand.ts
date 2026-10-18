import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { bankerRoleId, officerRoleId, modRoleId } from "../../../config";
import { bankData } from "../bank-data";
import { authorizeByMemberRoles } from "../../../shared/command/util";
import { autoCompleteAllItems } from "../helpers";

enum Option {
  Item = "item",
}

class GetItemData extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [bankerRoleId, officerRoleId, modRoleId],
      interaction
    );

    const item = this.getOption(Option.Item, interaction);
    const embed = new EmbedBuilder();

    if (!item) {
      throw new Error(`An item is required.`);
    } else {
      const itemData = await bankData.getItemStockById(
        parseInt(String(item.value))
      );

      if (itemData) {
        const countAvailable = itemData?.stock.reduce(
          (total, s) => total + (s.count || 0),
          0
        );
        embed.setTitle(itemData.name);
        embed.setDescription(
          "id: " +
            itemData.id +
            "\nname: " +
            itemData.name +
            "\ntype: " +
            itemData.type +
            "\nprice: " +
            itemData.price +
            "\nin stock: " +
            countAvailable
        );
      } else {
        embed.setDescription("Item not found");
      }
      // console.log(itemData);
      interaction.editReply({
        content: "",
        embeds: [embed],
      });
    }
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName(Option.Item)
        .setDescription("Item data to request")
        .setRequired(true)
        .setAutocomplete(true)
    );
  }

  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction
  ) {
    const input = interaction.options.getString("item");
    // console.log("input", input)
    switch (option) {
      case Option.Item:
        if (input && input.length > 3) {
          return await autoCompleteAllItems(input);
        } else {
          return [];
        }
    }
  }
}

export const getItem = new GetItemData("get-item-data", "Get Item Data");
