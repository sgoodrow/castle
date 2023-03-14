import { APIEmbedField } from "discord-api-types/v10";
import { Client, MessageEmbed, StageChannel, VoiceChannel } from "discord.js";
import { truncate } from "lodash";
import { getGuild } from "../..";
import { rolesChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { HOURS } from "../../shared/time";
import { code } from "../../shared/util";

const NEWLINES = /[\r\n]+/g;

interface Event {
  eventLeader: string;
  voiceChannel: StageChannel | VoiceChannel;
  start: string;
  end?: string;
  title: string;
  description: string;
  url: string;
}

export const updateRaidSchedule = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateRaidScheduleInfoAction(client), options);

class UpdateRaidScheduleInfoAction extends InstructionsReadyAction {
  public async execute() {
    await this.createOrUpdateInstructions(
      {
        content: "_ _",
        embeds: [await this.getScheduleEmbed()],
      },
      Name.RaidSchedule
    );
  }

  private async getScheduleEmbed() {
    const events = await this.getEvents();
    return new MessageEmbed({
      title: "📅 Raid Schedule",
      description:
        events.length > 0
          ? "Upcoming raids for the next 7 days."
          : "There are no raids currently scheduled.",
      fields: events.map((e) => this.renderEvent(e)),
      footer: {
        text: "All times are listed in your local timezone.",
      },
      color: "BLURPLE",
    });
  }

  private async getEvents(): Promise<Event[]> {
    const guild = await getGuild();
    const events = await guild.scheduledEvents.fetch();
    return events
      .filter(
        (e) =>
          ["SCHEDULED", "ACTIVE"].includes(e.status) && e.entityType === "VOICE"
      )
      .map((e) => ({
        eventLeader: e.creator ? `<@${e.creator.id}>` : "Unknown",
        voiceChannel: e.channel as StageChannel | VoiceChannel,
        start: this.getStartTime(e.scheduledStartTimestamp || 0),
        url: e.url,
        title:
          `${e.name}${
            this.within24Hours(e.scheduledStartTimestamp || 0)
              ? ` (<t:${Math.floor(
                  (e.scheduledStartTimestamp || 0) / 1000
                )}:R>)`
              : ""
          }` || "unknown",
        description: `${e.description}` || "",
      }));
  }

  private within24Hours(t: number) {
    const duration = t - Date.now();
    return duration < 24 * HOURS;
  }

  private getStartTime(t: number) {
    if (!t) {
      return "unknown";
    }
    const time = Math.floor(t / 1000);
    return `<t:${time}>`;
  }

  private renderEvent(e: Event): APIEmbedField {
    const description = e.description
      ? `\n• ${this.getTruncatedDescription(e)}`
      : "";
    return {
      name: e.title,
      value: `• ${e.start} ${e.eventLeader}${description}
• [info](${e.url})`,
      inline: false,
    };
  }

  private getTruncatedDescription(e: Event) {
    return truncate(e.description.replace(NEWLINES, " "), {
      length: 100,
    });
  }

  protected get channel() {
    //  todo change this to schedule
    return this.getChannel(rolesChannelId, "raid schedule");
  }
}
