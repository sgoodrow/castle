import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { raiderRoleId } from "../../../config";

export class InfoSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(raiderRoleId))) {
      throw new Error("Must be a raider to use this command");
    }
    const links = [
      "[DKP rules](https://docs.google.com/document/d/1IEfzx_o-BQDk63WYf1MQLhkmoavuHBEBo-4VyTwUn20/edit?tab=t.0)",
      "[DKP site](https://castle.opendkp.com/)",
      "[DKP calculator](https://docs.google.com/spreadsheets/d/1qYJag-EjTMfP9ECmW7n-4aWI7f_bbA0_P2r4zYJ3Svk/edit?gid=1604649504)",
      "[Castle Bot spreadsheet](https://docs.google.com/spreadsheets/d/1hS01upyJZW5_n8ffPCRjro1IS4Z9YwIl7vcSFM9ms7M/edit?pli=1&gid=0#gid=0)",
      "[Raid playbook (strategy)](https://docs.google.com/document/d/1noK2ZIE9JkWUktLJ4asPj64SClswAMhm7-w9Aj6eEqA/edit?tab=t.0)",
      "[Raid DKP values](https://docs.google.com/spreadsheets/d/1cZdD1HOtDutOvxkEp0-upfx5qyY4C-pfaME7VM7ou40/edit?gid=131422595#gid=131422595)",
      "[Raid level requirements](https://docs.google.com/document/d/1IEfzx_o-BQDk63WYf1MQLhkmoavuHBEBo-4VyTwUn20/edit?tab=t.0#heading=h.if0kiexd4zph)",
    ].join("\n");

    await interaction.editReply({
      content: `**Raid Info**\n\n${links}`,
    });
  }

  public async getOptionAutocomplete(): Promise<
    ApplicationCommandOptionChoiceData[] | undefined
  > {
    return undefined;
  }
}

export const infoSubcommand = new InfoSubcommand(
  "info",
  "Get useful raid-related links."
);
