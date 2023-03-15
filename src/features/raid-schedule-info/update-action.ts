import { Client, MessageEmbed } from "discord.js";
import { truncate } from "lodash";
import { getGuild } from "../..";
import { raidScheduleChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { HOURS } from "../../shared/time";

const NEWLINES = /[\r\n]+/g;

interface Event {
  startTime: number;
  leader: string;
  url: string;
  title: string;
  description: string;
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
    const events = await this.getSortedEvents();
    return new MessageEmbed({
      title: "📅 Raid Schedule",
      description:
        events.length > 0
          ? `Upcoming raids for the next 7 days.

${events.map((e) => this.renderEvent(e)).join("\n\n")}`
          : "There are no raids currently scheduled.",
      footer: {
        text: "All times are listed in your local timezone.",
      },
      color: "BLURPLE",
    });
  }

  private async getSortedEvents(): Promise<Event[]> {
    const events = await this.getEvents();
    return events.sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
  }

  private async getEvents(): Promise<Event[]> {
    const guild = await getGuild();
    const events = await guild.scheduledEvents.fetch();
    return events
      .filter(
        (e) =>
          !!e.creator &&
          !!e.channel?.isVoice() &&
          !!e.scheduledStartTimestamp &&
          ["SCHEDULED", "ACTIVE"].includes(e.status)
      )
      .map((e) => ({
        leader: e.creator?.toString() || "",
        startTime: e.scheduledStartTimestamp || 0,
        title: `${this.getStartTime(e.scheduledStartTimestamp)} [**${
          e.name
        }**](${e.url})${this.getUrgentTimeRemaining(
          e.scheduledStartTimestamp
        )}`,
        url: e.url,
        description: e.description || "",
      }));
  }

  private getUrgentTimeRemaining(t: number | null) {
    return this.within24Hours(t || 0)
      ? ` (<t:${Math.floor((t || 0) / 1000)}:R>)`
      : "";
  }

  private within24Hours(t: number) {
    const duration = t - Date.now();
    return duration < 24 * HOURS;
  }

  private getStartTime(t: number | null) {
    if (!t) {
      return "unknown";
    }
    const time = Math.floor(t / 1000);
    return `<t:${time}>`;
  }

  private renderEvent(e: Event) {
    const description = e.description
      ? `\n• ${this.getTruncatedDescription(e)}`
      : "";
    return `${e.title}
• Lead by ${e.leader}${description}`;
  }

  private getTruncatedDescription(e: Event) {
    const description = e.description.replace(NEWLINES, " ");
    return truncate(description, {
      length: 100,
    });
  }

  protected get channel() {
    return this.getChannel(raidScheduleChannelId, "raid schedule");
  }
}
