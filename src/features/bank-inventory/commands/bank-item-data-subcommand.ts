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
  Item = "item"
}

class GetItemData extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    const item = this.getOption(Option.Item, interaction);
    const embed = new EmbedBuilder();
    // authorize
    authorizeByMemberRoles([
      bankerRoleId, officerRoleId, modRoleId
    ], interaction);

    // 
    if (!item) {
      throw new Error(`An item is required.`); 
    } else {
      const itemData = await bankData.getItemStockById(parseInt(String(item.value)));
      console.log(itemData);
    }

  }

  public get command() {
    return super.command
      .addStringOption((o) =>
      o.setName(Option.Item)
      .setDescription("Item data to request")
      .setRequired(true)
      .setAutocomplete(true)
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

export const GetItem = new GetItemData(
  "get-item",
  "Get Item Data"
);
