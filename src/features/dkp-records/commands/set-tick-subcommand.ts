import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";
import {
  dkpDeputyRoleId,
  dkpRecordsChannelId,
  officerRoleId,
} from "../../../config";
import { Subcommand } from "../../../shared/command/subcommand";
import { getRaidReport } from "../raid-report";
import { RaidValuesService } from "../../../services/raidValuesService";

enum Option {
  Tick = "tick",
  Value = "value",
  Event = "event",
  Note = "note",
  KillBonus = "killbonus"
}

export class SetTickSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description, true);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    // filter non-threads
    if (!interaction.channel?.isThread()) {
      throw new Error("Must use this command in a raid thread");
    }

    // filter channel
    if (interaction.channel.parentId !== dkpRecordsChannelId) {
      throw new Error("Must use this command in a raid thread");
    }

    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(dkpDeputyRoleId) || roles.cache.has(officerRoleId))) {
      throw new Error("Must be a DKP Deputy or Officer to use this command");
    }

    // get raid report
    const { report } = await getRaidReport(interaction.channel);

    const eventName = this.getRequiredOptionValue<string>(
      Option.Event,
      interaction
    );
    const dkpEvent = await RaidValuesService.getInstance().getRaidValue(eventName);
    if (!dkpEvent) {
      throw new Error(`${dkpEvent} not found`);
    }
    const note = this.getOptionValue<string>(Option.Note, interaction);
    const tick = this.getOptionValue<number>(Option.Tick, interaction);
    let value = this.getOptionValue<number>(Option.Value, interaction);
    if (value === undefined) {      
      value = dkpEvent?.baseDkp || 0;
    }
    let killBonus = this.getOptionValue<boolean>(Option.KillBonus, interaction);
    if (killBonus === true) {
      value += dkpEvent.killDkp;
    }

    const ticksUpdated = report.updateRaidTick(dkpEvent, value, tick, note);

    await report.save(interaction.channelId);

    await report.tryUpdateThreadName(interaction.channel);

    const message = `${interaction.user} identified ${ticksUpdated.join(
      ", "
    )} as "${dkpEvent.target} (${value})".`;

    await interaction.channel.send(message);

    await interaction.editReply("Done");
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
      .addBooleanOption((o) => 
        o.setName(Option.KillBonus)
        .setDescription("True if a kill bonus should be applied")
        .setRequired(true)
      )
      .addNumberOption((o) =>
        o
          .setName(Option.Tick)
          .setDescription(
            "The raid tick number, starting at 1. If not set, all ticks are assigned."
          )
      )
      .addNumberOption((o) =>
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

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Event:
        return await RaidValuesService.getInstance().getRaidValueOptions();
      default:
        return;
    }
  }
}

export const setTickSubcommand = new SetTickSubcommand(
  "tick",
  "Sets a raid tick's value and type."
);
