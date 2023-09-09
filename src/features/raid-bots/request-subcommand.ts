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
import { Mutex } from "async-mutex";
import { Account } from "../../services/spreadsheets/accounts";

export enum Option {
  Name = "name",
}

export class RequestSubcommand extends Subcommand {
  private mutex: Mutex;

  public constructor(name: string, description: string) {
    super(name, description);
    this.mutex = new Mutex();
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getOption(Option.Name, interaction)?.value as string;

    const currentPilot = await sharedCharacters.getCurrentBotPilot(name);

    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }

    let details: Account | undefined = undefined;
    try {
      details = await sharedCharacters.getAccount(
        name,
        interaction.member?.roles as GuildMemberRoleManager
      );
    } catch (err) {
      const message = await thread.send("OK");
      const response = `❌ Denied ${interaction.user} access to the first available ${botClass}: ${assigned}.`;
      await message.edit(response);
      return;
    }

    const isBot = await sharedCharacters.isBot(name);
    if (isBot && !currentPilot) {
      const release = await this.mutex.acquire();
      await sharedCharacters.updateBotPilot(name, interaction.user.username);
      await sharedCharacters.updateBotCheckoutTime(name, moment());
      release();
      await interaction.user
      .send(`Your name has been added to the public bot sheet along with a timestamp.
        
**Assigned:** ${details.characters} (${details.purpose})
**Account:** ${details.accountName}
**Password:** ${spoiler(details.password)}

Please use \`/bot park <name> <location if you moved it>\` when you are finished in order to automatically remove your details from the public sheet.${}`);
    } else {
      await interaction.user.send(`**Assigned:** ${details.characters} (${details.purpose})
**Account:** ${details.accountName}
**Password:** ${spoiler(details.password)}
`);
    }

    let response = `The credentials for ${name} have been DM'd to you. Please remember to use \`/bot park\` when you are done!`;
    if (currentPilot) {
      response += `\n\n**Please note that ${currentPilot} is marked as the pilot of ${name} and you may not be able to log in. Your name will not be added as the botpilot in the public bot sheet!**`;
    }
    await interaction.editReply(response);
    const message = await thread.send("OK");
    message.edit(`✅ Granted ${interaction.user} access to ${name}.`);
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
        return await sharedCharacters.getAccountOptions();
      default:
        return;
    }
  }
}

export const requestSubcommand = new RequestSubcommand(
  "request",
  "Request the credentials for a character."
);
