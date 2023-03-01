import {
  ApplicationCommandOptionChoice,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsChannelId,
  officerRoleId,
} from "../../config";
import { Subcommand } from "../../shared/command/subcommand";
import { raidEventsMap } from "./raid-events";
import { getRaidReport } from "./raid-report";

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
    if (interaction.channel.parentId !== dkpRecordsChannelId) {
      return;
    }

    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(dkpDeputyRoleId) || roles.cache.has(officerRoleId))) {
      return;
    }

    // get raid report
    const { raid, message } = await getRaidReport(interaction.channel);

    const tick = Number(this.getOption(Option.Tick, interaction)?.value);
    const event = String(this.getOption(Option.Event, interaction)?.value);
    const value =
      Number(this.getOption(Option.Value, interaction)?.value) ||
      raidEventsMap[event].value;

    try {
      raid.setRaidTick(tick, value, event);
    } catch (err) {
      throw new Error(`Could not update raid tick with command values: ${err}`);
    }

    try {
      await message.edit({
        embeds: raid.embeds,
      });
    } catch (err) {
      throw new Error(
        `Could not generate edited raid report with command values: ${err}`
      );
    }

    await interaction.editReply(
      `Identified tick ${tick} as "${event} (${value})".`
    );
  }

  public get command() {
    return super.command
      .addNumberOption((o) =>
        o
          .setName(Option.Tick)
          .setDescription("The raid tick number. Starts at 1, not 0.")
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Event)
          .setDescription("The type of raid event to create in CastleDKP.com")
          .setAutocomplete(true)
          .setRequired(true)
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
        return Object.keys(raidEventsMap).map((l) => ({
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
