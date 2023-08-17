import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { accounts } from "../../services/accounts";
import { raidBotInstructions } from "./update-bots";
import { PublicAccountService } from "../../services/public-accounts";
import moment from "moment";
import { Class } from "../../shared/classes";
import { capitalize } from "../../shared/util";
import { Mutex } from "async-mutex";

export enum Option {
  Class = "class",
  Location = "location",
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
    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }

    let status = "✅ ";
    let firstBot = "";
    const release = await this.mutex.acquire();
    try {
      try {
        const publicAccounts = PublicAccountService.getInstance();
        firstBot = await publicAccounts.getFirstAvailableBotByClass(
          botClass,
          location
        );
      } catch (err) {
        status = "❌";
        await interaction.editReply(
          `No bot was found matching the provided criteria.`
        );

        let response = `${interaction.user} requested access to the first available ${botClass}`;
        if (location) {
          response += ` in ${location}`;
        }
        response += ` and got nothing ${status} (${err})`;
        const logMsg = await thread.send("OK");
        await logMsg.edit(response);
        return;
      }

      try {
        const details = await accounts.getAccount(
          firstBot,
          interaction.member?.roles as GuildMemberRoleManager
        );

        await interaction.user
          .send(`${firstBot} is the first available ${botClass} in the sheet. Your name has automatically been added to the public bot sheet along with a timestamp.\n
  
  ${details.characters} (${details.purpose})\n
  Account: ${details.accountName}\n
  Password: ${spoiler(details.password)}\n\n
  
  When you are finished with the bot, please use /bot park <name> <location if you moved it>. This will automatically remove your details from the public sheet`);

        await interaction.editReply(
          `The credentials for ${firstBot} have been DM'd to you. Please remember to /bot park when you are done with the bot.`
        );

        // Update public record
        try {
          const guildUser = await interaction.guild?.members.fetch(
            interaction.user.id
          );
          await PublicAccountService.getInstance().updateBotPilot(
            firstBot,
            guildUser?.user.username || "UNKNOWN USER"
          );
          await PublicAccountService.getInstance().updateBotCheckoutTime(
            firstBot,
            moment()
          );
        } catch (err) {
          throw new Error(
            "Failed to update public record, check the configuration"
          );
        }
      } catch (err) {
        status = "❌";

        await interaction.editReply(
          `You do not have the correct permissions to access ${firstBot}.`
        );
      }

      const logMsg = await thread.send("OK");
      logMsg.edit(
        `${interaction.user} requested access to the first available ${botClass} and got ${firstBot} ${status}`
      );
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
        return PublicAccountService.getInstance().getLocationOptions();
      default:
        return;
    }
  }
}

export const requestClassSubcommand = new RequestClassSubcommand(
  "requestclass",
  "Request the credentials for the first available character of specified class."
);
