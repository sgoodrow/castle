import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { accounts } from "../../services/accounts";
import { raidBotInstructions } from "./update-bots";
import moment from "moment";
import { Class } from "../../shared/classes";
import { capitalize } from "../../shared/util";
import { Mutex } from "async-mutex";
import { LocationService } from "../../services/location";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { BOT_SPREADSHEET_COLUMNS } from "../../services/sheet-updater/public-sheet";

export enum Option {
  Location = "location",
}

export class RequestZoneSubcommand extends Subcommand {
  private mutex: Mutex;
  public constructor(name: string, description: string) {
    super(name, description);
    this.mutex = new Mutex();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const location = this.getOption(Option.Location, interaction)
      ?.value as string;
    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }

    let status = "✅ Granted";
    let firstBot = "";
    const release = await this.mutex.acquire();
    const publicAccounts = PublicAccountsFactory.getService();

    const guildUser = await interaction.guild?.members.fetch(
      interaction.user.id
    );

    if (!guildUser) {
      throw new Error("Couldn't identify user requesting bot");
    }

    try {
      console.log(
        `${
          guildUser.nickname || guildUser.user.username
        } requested anything in ${location}`
      );
      try {
        firstBot = await publicAccounts.getFirstAvailableBotByLocation(
          location,
          interaction.member?.roles as GuildMemberRoleManager,
          interaction
        );
        
        await publicAccounts.doBotCheckout(firstBot, interaction);

      } catch (err) {
        status = "❌ Denied";
        await interaction.editReply(
          `No bot was found matching the provided criteria.\n${err}`
        );
        const message = await thread.send("OK");
        let response = `${status} ${interaction.user} access to the first available bot at ${location}`;
        response += `.\n(${err})`;
        await message.edit(response);
        return;
      }
    } finally {
      release();
    }
  }

  public get command() {
    const command = super.command.addStringOption((o) =>
      o
        .setName(Option.Location)
        .setDescription("The location of bot")
        .setAutocomplete(true)
        .setRequired(true)
    );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Location:
        return LocationService.getInstance().getLocationOptions();
      default:
        return;
    }
  }
}

export const requestZoneSubcommand = new RequestZoneSubcommand(
  "requestzone",
  "Request the credentials for the first available character in a specified zone."
);
