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
  Note = "note",
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

    const eventName = this.getRequiredOptionValue<string>(
      Option.Event,
      interaction
    );
    const note = this.getOptionValue<string>(Option.Note, interaction);
    const tick = this.getOptionValue<number>(Option.Tick, interaction);
    let value = this.getOptionValue<number>(Option.Value, interaction);
    if (value === undefined) {
      const dkpEvent = await castledkp.getEvent(eventName);
      value = dkpEvent?.value || 0;
    }

    const event = await castledkp.getEvent(eventName);
    if (!event) {
      throw new Error(`The event type "${eventName}" could not be found.`);
    }

    const ticksUpdated = report.updateRaidTick(event, value, tick, note);

    await report.editMessages(messages);

    if (report.allTicksHaveEvent) {
      await report.updateThreadName(interaction.channel);
    }

    await interaction.editReply(
      `Identified ${ticksUpdated.join(", ")} as "${
        event.shortName
      } (${value})".`
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
      )
      .addStringOption((o) =>
        o
          .setName(Option.Note)
          .setDescription("An optional note to be added to the raid tick.")
      );
  }

  public async getOptionAutocomplete(
    option: string
  ): Promise<ApplicationCommandOptionChoice[] | undefined> {
    switch (option) {
      case Option.Event:
        return (await castledkp.getEvents()).map((e) => ({
          name: e.shortName,
          value: e.name,
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
