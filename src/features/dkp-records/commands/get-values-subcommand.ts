import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  EmbedBuilder,
  GuildMemberRoleManager,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsChannelId,
  officerRoleId,
  raiderRoleId,
} from "../../../config";
import { castledkp } from "../../../services/castledkp";
import { Subcommand } from "../../../shared/command/subcommand";
import { getRaidReport } from "../raid-report";
import { RaidValuesService } from "../../../services/raidValuesService";

enum Option {
  Event = "event"
}

export class GetValuesSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, false);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    if (!interaction.channel?.isTextBased()) {
      throw new Error("Must use this command in a text channel");
    }

    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(raiderRoleId))) {
      throw new Error("Must be a raider to use this command");
    }

    const event = this.getRequiredOptionValue<string>(
      Option.Event,
      interaction
    );
    const raidEvent = await RaidValuesService.getInstance().getRaidValue(event);
    if (raidEvent) {
      const embed = new EmbedBuilder()
            .setTitle(`DKP values for ${raidEvent.description}`)
            .addFields(
              {
                name: "Values",
                value: [
                  `**Tier:** ${raidEvent.tier}`,
                  `**Base DKP:** ${raidEvent.baseDkp}`,
                  `**Kill DKP:** ${raidEvent.killDkp}`,
                  `**Race FTE bonus:** ${raidEvent.raceFteBonus}`,
                  `**Camp FTE bonus:** ${raidEvent.campFteBonus}`,
                  `**Dirty/clean tags:** ${raidEvent.dirtyCleanTagBonus}`,
                  `**Racing hourly:** ${raidEvent.racingHourly}`,
                  `**RTE hourly:** ${raidEvent.rteHourly}`,
                  `**Tracking hourly:** ${raidEvent.trackingHourly}`,
                ].join("\n"),
              },
            );

      await interaction.editReply({ content: "", embeds: [embed] });
    } else {
      await interaction.editReply({ content: "No event found"});
    }
  }

  public async getOptionAutocomplete(option: string) {
      switch (option) {
        case Option.Event:
          return await RaidValuesService.getInstance().getRaidValueOptions();
        default:
          return;
      }
    }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Event)
          .setDescription("The raid event name.")
          .setAutocomplete(true)
          .setRequired(true)
      )
  }
}

export const getValuesSubcommand = new GetValuesSubcommand(
  "getvalues",
  "Gets a raid tick's value data"
);
