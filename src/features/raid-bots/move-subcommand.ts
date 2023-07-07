import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { accounts } from "../../services/accounts";
import { PublicAccountService } from "../../services/public-accounts";

export enum Option {
  Name = "name",
  Location = "location",
}

export class MoveSubcommand extends Subcommand {
  publicAccountService: PublicAccountService;
  public constructor(name: string, description: string) {
    super(name, description);
    this.publicAccountService = PublicAccountService.getInstance();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getRequiredOptionValue(Option.Name, interaction) as string;
    const location = this.getRequiredOptionValue(Option.Location, interaction) as string;

    // const thread = await raidBotInstructions.getThread();
    // if (!thread) {
    //   throw new Error(`Could not locate bot request thread.`);
    // }

    let status = "✅ ";

    try {
      const details = await accounts.getAccount(
        name,
        interaction.member?.roles as GuildMemberRoleManager
      );
    } catch (error: any) {
      await interaction.editReply(`Failed to move bot: ${error}`);
    }

    // do move
    try {
      await this.publicAccountService.updateBotLocation(name, location);
      await interaction.editReply(`Sheet was updated to show ${name} was moved to ${location}`);
    } catch (error: any) {
      await interaction.editReply(`Failed to move bot: ${error}`);
    }    
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(Option.Name)
        .setDescription("The name of the character")
        .setAutocomplete(true)
        .setRequired(true)
    ).addStringOption((o) => 
      o.setName(Option.Location)
        .setDescription("The new location where the character is parked")
        .setAutocomplete(false)
        .setRequired(true)
    );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Name:
        return await accounts.getOptions();
      default:
        return;
    }
  }
}

export const moveSubCommand = new MoveSubcommand(
  "move",
  "Update a bot's location."
);
