import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { bots } from "../../services/shared-characters";
import { raidBotInstructions } from "./update-bots";
import moment from "moment";

export enum Option {
  Name = "name",
}

export class RequestSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const name = this.getOption(Option.Name, interaction)?.value as string;

    let status = "✅ Granted";

    const currentPilot = await bots.getCurrentBotPilot(name);

    try {
      const details = await bots.getAccount(
        name,
        interaction.member?.roles as GuildMemberRoleManager
      );

      await interaction.user.send(`${details.characters} (${details.purpose})
Account: ${details.accountName}
Password: ${spoiler(details.password)}

**If a bot can be moved**, and you move it, please include the location in your /bot park`);
      let response = "";

      if (currentPilot) {
        response += `** Please note that ${currentPilot} is marked as the pilot of ${name} and you may not be able to log in. Your name will not be added as the botpilot in the public bot sheet! **\n\n`;
      }
      response += `The credentials for ${name} have been DM'd to you. Please remember to use \`/bot park\` when you are done!`;
      await interaction.editReply(response);
    } catch (err) {
      status = "❌ Denied";

      await interaction.editReply(
        `You do not have the correct permissions to access ${name}.`
      );
    }

    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }
    const logMsg = await thread.send("OK");
    logMsg.edit(`${status} ${interaction.user} access to ${name}.`);

    // Update public record
    if (await bots.getIsBot(name)) {
      try {
        const guildUser = await interaction.guild?.members.fetch(
          interaction.user.id
        );

        if (!currentPilot) {
          await bots.updateBotPilot(
            name,
            guildUser?.user.username || "UNKNOWN USER"
          );
          await bots.updateBotCheckoutTime(name, moment());
        }
      } catch (err) {
        throw new Error(
          "Failed to update public record, check the configuration"
        );
      }
    }
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
        return await bots.getAccountOptions();
      default:
        return;
    }
  }
}

export const requestSubcommand = new RequestSubcommand(
  "request",
  "Request the credentials for a character."
);
