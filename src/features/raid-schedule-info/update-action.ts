import { Client, MessageEmbed } from "discord.js";
import { truncate } from "lodash";
import { getGuild } from "../..";
import { raiderRoleId, raidScheduleChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { DAYS, HOURS } from "../../shared/time";
import { compactDescription } from "../../shared/util";

interface Event {
  date: string;
  event: string;
  countdown: string;
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
          ? `Upcoming raids for the next 7 days. Click the raid name for more details.

${events.map((e) => this.renderEvent(e)).join("\n\n")}`
          : "There are no raids currently scheduled.",
      footer: {
        text: "All times are listed in your local timezone.",
      },
      color: "BLURPLE",
    });
  }

  private async getEvents(): Promise<Event[]> {
    const guild = await getGuild();
    const events = await guild.scheduledEvents.fetch();
    const raiderRole = await guild.roles.fetch(raiderRoleId);

    if (!raiderRole) {
      throw new Error("Could not locate the raider role");
    }

    const nextWeek = Date.now() + 7 * DAYS;

    return events
      .filter(
        (e) =>
          !!e.channel?.isVoice() &&
          !!e.scheduledStartTimestamp &&
          ["SCHEDULED", "ACTIVE"].includes(e.status) &&
          e.channel.permissionsFor(raiderRole).has("VIEW_CHANNEL") &&
          e.scheduledStartTimestamp <= nextWeek // Added filter condition
      )
      .sort(
        (a, b) =>
          (a.scheduledStartTimestamp || 0) - (b.scheduledStartTimestamp || 0)
      )
      .map((e) => ({
        date: this.getDate(e.scheduledStartTimestamp),
        event: this.getEvent(e.name, e.url),
        countdown: this.getCountdown(e.scheduledStartTimestamp),
        description: this.getDescription(e.description, e.url),
      }));
  }

  private getCountdown(t: number | null) {
    return this.within24Hours(t || 0)
      ? ` (<t:${Math.floor((t || 0) / 1000)}:R>)`
      : "";
  }

  private within24Hours(t: number) {
    const duration = t - Date.now();
    return duration < 24 * HOURS;
  }

  private getEvent(name: string, url: string) {
    return `__**[${name}](${url})**__`;
  }

  private getDate(t: number | null) {
    if (!t) {
      return "unknown";
    }
    const emoji = {
      Sunday: "⬜",
      Monday: "🟥",
      Tuesday: "🟧",
      Wednesday: "🟨",
      Thursday: "🟩",
      Friday: "🟦",
      Saturday: "🟪",
    }[
      new Date(t).toLocaleString("en", {
        weekday: "long",
        timeZone: "America/New_York",
      })
    ];
    const time = Math.floor(t / 1000);
    return `${emoji} <t:${time}:F>`;
  }

  private renderEvent(e: Event) {
    return `${e.event}
${e.date}${e.countdown}${e.description}`;
  }

  private getDescription(description: string | null, url: string) {
    if (!description) {
      return "";
    }
    const compact = compactDescription(description);
    let moreInfo = "";
    if (compact.length < description.length) {
      moreInfo = ` ([more info](${url}))`;
    }
    return `\n${compact}${moreInfo}`;
  }

  protected get channel() {
    return this.getChannel(raidScheduleChannelId, "raid schedule");
  }
}
