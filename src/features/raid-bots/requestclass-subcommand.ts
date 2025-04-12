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
  Class = "class",
  Location = "location",
  BindLocation = "bindlocation",
}

export class RequestClassSubcommand extends Subcommand {
  private mutex: Mutex;
  public constructor(name: string, description: string) {
    super(name, description);
    this.mutex = new Mutex();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const botClass = capitalize(
      this.getOption(Option.Class, interaction)?.value as string
    );
    const location = this.getOption(Option.Location, interaction)
      ?.value as string;
    const bindLocation = this.getOption(Option.BindLocation, interaction)
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
        } requested ${botClass} ${location ? `in ${location}` : ""}`
      );
      try {
        firstBot = await publicAccounts.getFirstAvailableBotByClass(
          botClass,
          interaction.member?.roles as GuildMemberRoleManager,
          interaction,
          location,
          bindLocation
        );
        
        await publicAccounts.doBotCheckout(firstBot, interaction);

      } catch (err) {
        status = "❌ Denied";
        await interaction.editReply(
          `No bot was found matching the provided criteria.\n${err}`
        );
        const message = await thread.send("OK");
        let response = `${status} ${interaction.user} access to the first available ${botClass}`;
        if (location) {
          response += ` in ${location}`;
        }
        response += `.\n(${err})`;
        await message.edit(response);
        return;
      }
    } finally {
      release();
    }
  }

  public get command() {
    const command = super.command
      .addStringOption((o) =>
        o
          .setName(Option.Class)
          .setDescription("The class of a bot you want to checkout")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Location)
          .setDescription("The location of bot")
          .setAutocomplete(true)
          .setRequired(false)
      )
      .addStringOption((o) =>
        o
          .setName(Option.BindLocation)
          .setDescription("Bind location")
          .setAutocomplete(true)
          .setRequired(false)
      );
    return command;
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Class:
        return Object.values(Class).map((val) => ({
          name: val,
          value: val,
        }));
      case Option.Location:
        return LocationService.getInstance().getLocationOptions();
      case Option.BindLocation:
        return LocationService.getInstance().getLocationOptions();
      default:
        return;
    }
  }
}

export const requestClassSubcommand = new RequestClassSubcommand(
  "requestclass",
  "Request the credentials for the first available character of specified class."
);
