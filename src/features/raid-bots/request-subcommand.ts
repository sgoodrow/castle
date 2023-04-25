import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { characters } from "../../services/characters";
import { getTextChannel } from "../..";
import { raidBotsChannelId } from "../../config";

export enum Option {
  Name = "name",
}

export class RequestSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getOption(Option.Name, interaction)?.value as string;

    // get character
    // TODO handle errors (log but dont DM)
    const details = await characters.getCharacterDetails(
      name,
      interaction.member?.roles as GuildMemberRoleManager
    );

    // dm
    await interaction.user.send(`${details.character} (${details.class} - ${
      details.level
    })
        Account: ${details.account}
        Password: ${spoiler(details.password)}`);

    // log it
    // TODO: in a thread
    const channel = await getTextChannel(raidBotsChannelId);
    await channel.send(
      `${interaction.user} requested access to ${details.character}`
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
        return await characters.getCharacterList();
      default:
        return;
    }
  }
}

export const requestSubcommand = new RequestSubcommand(
  "request",
  "Request the credentials for a character."
);
