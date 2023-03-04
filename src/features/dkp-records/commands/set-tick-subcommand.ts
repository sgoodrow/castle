import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsBetaChannelId,
  officerRoleId,
} from "../../../config";
import { castledkp } from "../../../services/castledkp";
import { Subcommand } from "../../../shared/command/subcommand";
import { getRaidReport } from "../raid-report";

enum Option {
  Tick = "tick",
  Value = "value",
  Event = "event",
}

export class SetTickSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    // filter non-threads
    if (!interaction.channel?.isThread()) {
      return;
    }

    // filter channel
    if (interaction.channel.parentId !== dkpRecordsBetaChannelId) {
      return;
    }

    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(dkpDeputyRoleId) || roles.cache.has(officerRoleId))) {
      return;
    }

    // get raid report
    const { report, messages } = await getRaidReport(interaction.channel);

    const event = String(this.getOption(Option.Event, interaction)?.value);
    const tick =
      Number(this.getOption(Option.Tick, interaction)?.value) || undefined;
    const value =
      Number(this.getOption(Option.Value, interaction)?.value) ||
      (await castledkp.getEvent(event))?.value ||
      0;

    const ticksUpdated = report.updateRaidTick(event, value, tick);

    await report.editMessages(messages);

    await interaction.editReply(
      `Identified tick ${ticksUpdated.join(", ")} as "${event} (${value})".`
    );
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Event)
          .setDescription("The type of raid event to create.")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addNumberOption((o) =>
        o
          .setName(Option.Tick)
          .setDescription(
            "The raid tick number, starting at 1. If not set, all ticks are assigned."
          )
      )
      .addIntegerOption((o) =>
        o
          .setName(Option.Value)
          .setDescription(
            "A custom DKP value of the raid tick. If not set, the value is determined from the event type."
          )
      );
  }

  public async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoice[] | undefined> {
    switch (option) {
      case Option.Event:
        return (await castledkp.getEventLabels()).map((l) => ({
          name: l,
          value: l,
        }));
      default:
        return;
    }
  }
}

export const setTickSubcommand = new SetTickSubcommand(
  "tick",
  "Sets a raid tick's value and type."
);
