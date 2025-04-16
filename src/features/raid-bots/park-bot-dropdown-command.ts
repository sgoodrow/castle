import {
    ButtonBuilder,
    ButtonComponent,
    ButtonInteraction,
    ButtonStyle,
    CacheType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ApplicationCommandOptionChoiceData
  } from "discord.js";
  import { ButtonCommand } from "../../shared/command/button-command";
  import { PublicAccountsFactory } from "../../services/bot/bot-factory";
  import { BOT_SPREADSHEET_COLUMNS } from "../../services/sheet-updater/public-sheet";
  
  export class ParkBotDropdownCommand extends ButtonCommand {
    constructor(name: string) {
      super(name);
    }

    public async execute(
      interaction: ButtonInteraction<CacheType>
    ): Promise<void> {
  
      const name = interaction.customId.split("_")[1];
      console.log(`Execute park-bot-dropdown ${name}`);
      try {
        const parkDetails = {
          [BOT_SPREADSHEET_COLUMNS.CurrentPilot]: "",
          [BOT_SPREADSHEET_COLUMNS.CheckoutTime]: "",
          [BOT_SPREADSHEET_COLUMNS.CurrentLocation]: undefined,
        };

        const guildUser = await interaction.guild?.members.fetch(
          interaction.user.id
        );
        console.log(`${guildUser?.nickname || guildUser?.user.username} clicked bot park button for ${name}`);
  
        await PublicAccountsFactory.getService().updateBotRowDetails(name, parkDetails);
        await interaction.editReply(`${name} was released in its previous location`);
        
      } catch (error) {
        await interaction.editReply(`Failed to move bot: ${error}`);
      }
      
    }
  
    public getSelectMenuBuilder(locations: ApplicationCommandOptionChoiceData<string>[]): StringSelectMenuBuilder {
        let locationOptions: StringSelectMenuOptionBuilder[] = [];
        locations.forEach((location) => {
            console.log(location);
            locationOptions.push(new StringSelectMenuOptionBuilder()
                .setLabel(location.value)
                .setDescription(`Park at ${location.value}`)
                .setValue(location.value));
        });
        return new StringSelectMenuBuilder()
        .setCustomId(this.customId)
        .addOptions(locationOptions);
    }

  }
  
  export const parkBotDropDownCommand = new ParkBotDropdownCommand(
    "parkbot_dropdown"
  );
  