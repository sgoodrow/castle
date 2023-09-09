import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { sharedCharacters } from "../../services/shared-characters";
import { raidBotInstructions } from "./update-bots";
import moment from "moment";
import { Class } from "../../shared/classes";
import { capitalize } from "../../shared/util";
import { Mutex } from "async-mutex";
import { Account } from "../../services/spreadsheets/accounts";

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

    const release = await this.mutex.acquire();
    const assigned = await sharedCharacters.getFirstAvailableBotByClass(
      botClass,
      location
    );

    let details: Account | undefined = undefined;
    try {
      details = await sharedCharacters.getAccount(
        assigned,
        interaction.member?.roles as GuildMemberRoleManager
      );
    } catch (err) {
      await interaction.editReply(
        `You do not have the correct permissions to access ${name}.`
      );
      const message = await thread.send("OK");
      const response = `❌ Denied ${interaction.user} access to the first available ${botClass}: ${assigned}.`;
      await message.edit(response);
      release();
      return;
    }
    await sharedCharacters.updateBotPilot(assigned, interaction.user.username);
    await sharedCharacters.updateBotCheckoutTime(assigned, moment());
    release();
    await interaction.user
      .send(`Your name has been added to the public bot sheet along with a timestamp.
        
**Assigned:** ${details.characters} (${details.purpose})
**Account:** ${details.accountName}
**Password:** ${spoiler(details.password)}

Please use \`/bot park <name> <location if you moved it>\` when you are finished in order to automatically remove your details from the public sheet.`);
    await interaction.editReply(
      `The credentials for ${assigned} have been DM'd to you. Please remember to \`/bot park\` when you are done with the character.`
    );
    const message = await thread.send("OK");
    const response = `✅ Granted ${interaction.user} access to the first available ${botClass}: ${assigned}.`;
    await message.edit(response);
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
        return sharedCharacters.getParkOptions();
      default:
        return;
    }
  }
}

export const requestClassSubcommand = new RequestClassSubcommand(
  "requestclass",
  "Request the credentials for the first available character of specified class."
);
