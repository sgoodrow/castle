import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { accounts } from "../../services/accounts";
import { raidBotInstructions } from "./update-bots";

export enum Option {
  Name = "name",
}

export class RequestSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getOption(Option.Name, interaction)?.value as string;

    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }

    let status = "✅ ";

    try {
      const details = await accounts.getAccount(
        name,
        interaction.member?.roles as GuildMemberRoleManager
      );

      await interaction.user.send(`${details.characters} (${details.purpose})
          Account: ${details.accountName}
          Password: ${spoiler(details.password)}

**If a bot can be moved**, and you move it, please update the location in: https://docs.google.com/spreadsheets/d/1hS01upyJZW5_n8ffPCRjro1IS4Z9YwIl7vcSFM9ms7M`);

      await interaction.editReply(
        `The credentials for ${name} have been DM'd to you.`
      );
    } catch (err) {
      status = "❌";

      await interaction.editReply(
        `You do not have the correct permissions to access ${name}.`
      );
    }

    await thread.send(
      `${interaction.user} requested access to ${name} ${status}`
    );
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(Option.Name)
        .setDescription("The name of the character")
        .setAutocomplete(true)
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

export const requestSubcommand = new RequestSubcommand(
  "request",
  "Request the credentials for a character."
);
