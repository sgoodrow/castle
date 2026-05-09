import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../../shared/command/subcommand";
import { openDkpService } from "../../../services/openDkpService";
import { RaidValuesService } from "../../../services/raidValuesService";
import { rteService } from "../../../services/rteService";
import { refreshRteStatusEmbed } from "../status-embed";
import { Class } from "../../../shared/classes";
import { RteType } from "@prisma/client";

export enum Option {
  Character = "character",
  Target = "target",
  Class = "class",
}

export class RteSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    const characterName = this.getRequiredOptionValue<string>(Option.Character, interaction);
    const target = this.getRequiredOptionValue<string>(Option.Target, interaction);
    const charClass = this.getRequiredOptionValue<string>(Option.Class, interaction);

    await rteService.startSession({
      discordId: interaction.user.id,
      discordUsername: interaction.user.username,
      characterName,
      target,
      type: RteType.RTE,
      charClass,
    });

    await refreshRteStatusEmbed();

    await interaction.editReply(`You are now RTE for **${target}** on **${characterName}** (${charClass}). Check your DMs for the session controls.`);
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Character)
          .setDescription("The game character performing the task.")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Target)
          .setDescription("The raid target.")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Class)
          .setDescription("The character class.")
          .setAutocomplete(true)
          .setRequired(true)
      );
  }

  public async getOptionAutocomplete(option: string, interaction: AutocompleteInteraction<CacheType>) {
    switch (option) {
      case Option.Character: {
        const chars = await openDkpService.getCharacters();
        return chars.map((c) => ({
          name: c.Name,
          value: c.Name,
        }));
      }
      case Option.Target:
        return await RaidValuesService.getInstance().getTargetOptions(interaction.user.id);
      case Option.Class:
        return Object.values(Class).map((c) => ({
          name: c,
          value: c,
        }));
      default:
        return;
    }
  }
}

export const rteSubcommand = new RteSubcommand("rte", "Indicate you are ready to engage a target.");
