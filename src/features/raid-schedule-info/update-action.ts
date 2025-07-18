import {
  ChannelType,
  Client,
  Colors,
  EmbedBuilder,
  GuildScheduledEventStatus,
  PermissionFlagsBits,
} from "discord.js";
import { getGuild } from "../..";
import {
  raiderRoleId,
  membersAndAlliesRoleId,
  raidScheduleChannelId,
} from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { DAYS } from "../../shared/time";
import { EventRenderer } from "./event-renderer";

export const updateRaidSchedule = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateRaidScheduleInfoAction(client), options);

class UpdateRaidScheduleInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        embeds: [await this.getScheduleEmbed()],
      },
      Name.RaidSchedule
    );
  }

  private async getScheduleEmbed() {
    const events = await this.getEvents();
    return new EmbedBuilder({
      title: "📅 Raid Schedule",
      description:
        events.length > 0
          ? `Upcoming raids for the next 7 days. Click the raid name for more details.

${events.map((e) => e.toString()).join("\n\n")}`
          : "There are no raids currently scheduled.",
      footer: {
        text: "All times are listed in your local timezone.",
      },
      color: Colors.Blurple,
    });
  }

  private async getEvents(): Promise<EventRenderer[]> {
    const guild = await getGuild();
    const events = await guild.scheduledEvents.fetch();
    const raiderRole = await guild.roles.fetch(raiderRoleId);

    if (!raiderRole) {
      throw new Error("Could not locate the raider role");
    }

    const membersRole = await guild.roles.fetch(membersAndAlliesRoleId);

    if (!membersRole) {
      throw new Error("Could not locate the members role");
    }

    const nextWeek = Date.now() + 7 * DAYS;

    return events
      .filter(
        (e) =>
          e.channel?.type != ChannelType.GuildVoice ||
          (e.channel?.type === ChannelType.GuildVoice &&
            !!e.scheduledStartTimestamp &&
            [
              GuildScheduledEventStatus.Scheduled,
              GuildScheduledEventStatus.Active,
            ].includes(e.status) &&
            (e.channel
              .permissionsFor(raiderRole)
              .has(PermissionFlagsBits.ViewChannel) ||
              e.channel
                .permissionsFor(membersRole)
                .has(PermissionFlagsBits.ViewChannel)) &&
            e.scheduledStartTimestamp <= nextWeek) // Added filter condition
      )
      .sort(
        (a, b) =>
          (a.scheduledStartTimestamp || 0) - (b.scheduledStartTimestamp || 0)
      )
      .map((e) => new EventRenderer(e, 100))
      .slice(0, 12);
  }

  protected get channel() {
    return this.getChannel(raidScheduleChannelId, "raid schedule");
  }
}
