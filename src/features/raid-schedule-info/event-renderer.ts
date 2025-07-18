import { GuildScheduledEvent } from "discord.js";
import { HOURS } from "../../shared/time";

export class EventRenderer {
  public constructor(
    private readonly data: GuildScheduledEvent,
    private readonly descriptionLength?: number
  ) {}

  public toString() {
    return `${this.event}
${this.date}${this.countdown}${this.description}`;
  }

  private get countdown() {
    return this.within24Hours(this.data.scheduledStartTimestamp || 0)
      ? ` (<t:${Math.floor(
          (this.data.scheduledStartTimestamp || 0) / 1000
        )}:R>)`
      : "";
  }

  private within24Hours(t: number) {
    const duration = t - Date.now();
    return duration < 24 * HOURS;
  }

  private get event() {
    return `__**[${this.data.name}](${this.data.url})**__`;
  }

  private get date() {
    if (!this.data.scheduledStartTimestamp) {
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
      new Date(this.data.scheduledStartTimestamp).toLocaleString("en", {
        weekday: "long",
        timeZone: "America/New_York",
      })
    ];
    const time = Math.floor(this.data.scheduledStartTimestamp / 1000);
    return `${emoji} <t:${time}:F>`;
  }

  private get description() {
    if (!this.data.description) {
      return "";
    }
    return `\n([more info](${this.data.url}))`;
  }
}
