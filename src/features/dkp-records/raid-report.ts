import axios from "axios";
import {
  Message,
  MessageAttachment,
  MessageEmbed,
  TextBasedChannel,
} from "discord.js";
import { every, flatMap, max, range, sumBy } from "lodash";
import { dkpDeputyRoleId } from "../../config";
import { castledkp } from "../../services/castledkp";
import { code } from "../../shared/util";

export interface Loot {
  item: string;
  buyer: string;
  price: number;
  tickNumber: number;
}

export interface Attendee {
  name: string;
  tickNumbers: number[];
}

export interface RaidTick {
  name: string;
  value?: number;
  event?: string;
  loot: Loot[];
  attendees: string[];
}

const RAID_REPORT_TITLE = "Raid Report";
const RAID_INSTRUCTIONS_TITLE = "Raider Instructions";

const THREAD_EMBED_CHAR_LIMIT = 4000;

export const isRaidReportMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_REPORT_TITLE);

export const isRaidInstructionsMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_INSTRUCTIONS_TITLE);

export const getRaidReport = async (channel: TextBasedChannel) => {
  const all = await channel.messages.fetch();
  const messages = [
    ...all
      .reverse()
      .filter((m) => isRaidReportMessage(m))
      .values(),
  ];
  if (messages.length === 0) {
    throw new Error("Could not find raid reports.");
  }

  const a = messages[0].attachments.first();
  if (!a) {
    throw new Error("Could not find raid report attachment");
  }

  const { data } = await axios({
    url: a.url,
    responseType: "json",
  });

  return {
    report: new RaidReport(data),
    messages,
  };
};

export class RaidReport {
  private readonly attendanceColumnLength: number;

  public constructor(
    private data: {
      name: string;
      raidTicks: RaidTick[];
    }
  ) {
    this.attendanceColumnLength =
      max(this.allAttendees.map((a) => a.length)) || 0;
  }

  public async editMessages(messages: Message[]) {
    const raidReportEmbeds = this.getRaidReportEmbeds();
    if (raidReportEmbeds.length > messages.length) {
      throw new Error(
        "Insufficient messages for number of embeds. This should never happen"
      );
    }

    try {
      await Promise.all(
        messages.map((m, i) => {
          const embeds = [raidReportEmbeds[i]];
          if (isRaidInstructionsMessage(m)) {
            embeds.push(this.instructionsEmbed);
          }
          m.edit({
            embeds,
            files: i === 0 ? this.files : undefined,
          });
        })
      );
    } catch (err) {
      throw new Error(
        `Could not generate edited raid report with action values: ${err}`
      );
    }
  }

  public get files(): MessageAttachment[] {
    return [
      new MessageAttachment(
        Buffer.from(JSON.stringify(this.data, null, 2), "utf-8")
      )
        .setName(`${this.data.name}.json`)
        .setSpoiler(true),
    ];
  }

  public get instructionsEmbed(): MessageEmbed {
    return new MessageEmbed({
      title: RAID_INSTRUCTIONS_TITLE,
      description: `Use the following commands to submit change requests. When a <@&${dkpDeputyRoleId}> confirms the change with ✅, it will be added to the Raid report.`,
    })
      .addField(
        "Add a name to raid ticks. Tick numbers are optional.",
        "`!add Pumped 2, 3`"
      )
      .addField(
        "Remove a name from raid ticks. Tick numbers are optional.",
        "`!rem Pumped 2, 3`"
      )
      .addField(
        "Replace a name on raid ticks. Tick numbers are optional.",
        "`!rep Pumped on Iceburgh 2, 3`"
      );
  }

  public getRaidReportEmbeds(): MessageEmbed[] {
    const report = `${this.data.raidTicks
      .map((t, i) => this.renderRaidTick(t, i + 1))
      .join("\n\n")}

${this.attendance}`;

    const pages: string[] = [""];
    report.split("\n").forEach((line) => {
      if (
        pages[pages.length - 1].length + line.length >
        THREAD_EMBED_CHAR_LIMIT
      ) {
        pages.push("");
      }
      pages[pages.length - 1] += `\n${line}`;
    });

    return pages.map(
      (p) =>
        new MessageEmbed({
          title: RAID_REPORT_TITLE,
          description: `${code}diff
${p}${code}`,
        })
    );
  }

  public getEarned(tickNumber: number) {
    const tick = this.getRaidTick(tickNumber);
    if (tick.value === undefined) {
      return 0;
    }
    return tick.attendees.length * tick.value;
  }

  public getSpent(tickNumber: number) {
    const tick = this.getRaidTick(tickNumber);
    return sumBy(tick.loot, (l) => l.price);
  }

  public getItemCount(tickNumber: number) {
    const tick = this.getRaidTick(tickNumber);
    return tick.loot.length;
  }

  public getPlayerCount(tickNumber: number) {
    const tick = this.getRaidTick(tickNumber);
    return tick.attendees.length;
  }

  public getNetDKP(tickNumber: number) {
    return this.getEarned(tickNumber) - this.getSpent(tickNumber);
  }

  public async uploadRaidTicks(threadUrl: string) {
    return Promise.all(
      this.data.raidTicks.map((t, i) =>
        castledkp.createRaid(t, i + 1, threadUrl)
      )
    );
  }

  public addPlayer(name: string, tickNumbers: number[]) {
    this.getRaidTicks(tickNumbers).forEach((t) => {
      if (!t.attendees.includes(name)) {
        t.attendees.push(name);
        t.attendees.sort();
      }
    });
  }

  public removePlayer(name: string, tickNumbers: number[]) {
    this.getRaidTicks(tickNumbers).forEach((t) => {
      const index = t.attendees.indexOf(name);
      if (index < 0) {
        return;
      }
      t.attendees.splice(index);
    });
  }

  public replacePlayer(
    replacer: string,
    replaced: string,
    tickNumbers: number[]
  ) {
    this.getRaidTicks(tickNumbers).forEach((t) => {
      const index = t.attendees.indexOf(replaced);
      if (index < 0) {
        return;
      }
      t.attendees.splice(index);
      t.attendees.push(replacer);
    });
  }

  private getRaidTicks(tickNumbers: number[]): RaidTick[] {
    return (tickNumbers.length === 0 ? this.allTickNumbers : tickNumbers).map(
      (t) => this.getRaidTick(t)
    );
  }

  public updateRaidTick(event: string, value: number, tick?: number) {
    const ticks = tick ? [tick] : this.allTickNumbers;
    ticks
      .map((t) => this.getRaidTick(t))
      .forEach((t) => {
        t.event = event;
        t.value = value;
      });

    return ticks;
  }

  private get allTickNumbers(): number[] {
    return range(1, this.data.raidTicks.length + 1);
  }

  private getRaidTick(tick: number): RaidTick {
    const raidTick = this.data.raidTicks[tick - 1];
    if (!raidTick) {
      throw new Error(`Could not find a raid tick matching ${tick}`);
    }
    return raidTick;
  }

  private renderRaidTick(t: RaidTick, tickNumber: number) {
    const ready = t.value !== undefined && t.event !== undefined;
    const all = "All".padEnd(this.attendanceColumnLength);
    const value = `+${this.getPaddedDkp(t.value)}`;
    const loot = t.loot.length > 0 ? `\n${this.renderTickLoot(t.loot)}` : "";
    return `--- Raid Tick ${tickNumber} (${t.name})---
${ready ? "+" : "-"} ${all} ${value} (${t.event || "Unknown Event"})${loot}`;
  }

  private getAttendanceMap() {
    return this.allAttendees.reduce((m, a) => {
      m[a] = this.data.raidTicks
        .map((tick, tickIndex) => ({ tick, tickNumber: tickIndex + 1 }))
        .filter(({ tick }) => tick.attendees.includes(a))
        .map(({ tickNumber }) => tickNumber);
      return m;
    }, {} as { [attendee: string]: number[] });
  }

  private get attendance(): string {
    const attendanceMap = this.getAttendanceMap();
    const sorted = Object.keys(attendanceMap).sort();
    return `--- Attendance ---
${sorted
  .map((name) =>
    this.renderAttendee(
      name.padEnd(this.attendanceColumnLength),
      attendanceMap[name]
    )
  )
  .join("\n")}`;
  }

  private get allAttendees() {
    return flatMap(this.data.raidTicks, (t) => t.attendees);
  }

  private getPaddedDkp(value?: number) {
    const s = value === undefined ? "?" : String(value);
    return s.padEnd(6);
  }

  private renderAttendee(attendee: string, tickNumbers: number[]): string {
    const ticks = tickNumbers.map((i) => this.getRaidTick(i));
    const dkp = ticks.reduce(
      (s, t) => (t.value !== undefined ? s + t.value : s),
      0
    );
    const calculatable = every(ticks, (t) => t.value !== undefined);
    return `${calculatable ? "+" : "-"} ${attendee} +${this.getPaddedDkp(
      calculatable ? dkp : undefined
    )} (${tickNumbers.join(", ")})`;
  }

  private renderTickLoot(loot: Loot[]): string {
    return loot
      .sort((a, b) => a.buyer.localeCompare(b.buyer))
      .map((l) => this.renderSingleLoot(l, this.attendanceColumnLength))
      .join("\n");
  }

  private renderSingleLoot(loot: Loot, padding: number) {
    return `+ ${loot.buyer.padEnd(padding)} -${this.getPaddedDkp(
      loot.price
    )} (${loot.item})`;
  }
}
