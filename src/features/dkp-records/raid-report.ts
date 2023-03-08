import axios from "axios";
import {
  Message,
  MessageAttachment,
  MessageEmbed,
  TextBasedChannel,
} from "discord.js";
import { every, flatMap, max, range, sumBy } from "lodash";
import moment from "moment";
import { dkpDeputyRoleId, raiderRoleId } from "../../config";
import { castledkp } from "../../services/castledkp";
import { code } from "../../shared/util";
import { Credit } from "./credit-parser";

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
  tickNumber: number;
  value?: number;
  event?: string;
  note?: string;
  loot: Loot[];
  attendees: string[];
  date: string;
  credits: Credit[];
}

const RAID_REPORT_TITLE = "Raid Report";
const INSTRUCTIONS_TITLE = "Instructions";
const THREAD_EMBED_CHAR_LIMIT = 4000;
const DKP_COLUMN_LENGTH = 6;

export const isRaidReportMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_REPORT_TITLE);

export const isRaidInstructionsMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === INSTRUCTIONS_TITLE);

export const getRaidReport = async (channel: TextBasedChannel) => {
  const all = await channel.messages.fetch();
  const messages = [
    ...all
      .reverse()
      .filter((m) => isRaidReportMessage(m) || isRaidInstructionsMessage(m))
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

const EVERYONE = "Everyone";

export class RaidReport {
  private readonly attendanceColumnLength: number;

  public constructor(
    private data: {
      name: string;
      raidTicks: RaidTick[];
    }
  ) {
    const attendanceNames = [...this.allAttendees, EVERYONE];
    this.attendanceColumnLength =
      max(attendanceNames.map((a) => a.length)) || 0;
  }

  public getCreditMessageContent(): string[] {
    return this.data.raidTicks.reduce((a, t, i) => {
      const tickNumber = i + 1;
      return a.concat(
        t.credits.map((c) => {
          return c.type === "UNKNOWN"
            ? `⚠️ Unparsable credit: ${c.character} said '${c.raw}' during Raid Tick ${tickNumber}`
            : c.type === "PILOT"
            ? `!rep ${c.character} with ${c.pilot} ${tickNumber}`
            : `!add ${c.character} ${tickNumber} (${c.reason})`;
        })
      );
    }, [] as string[]);
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
          // since the messages include a buffer message, which may not have any raid report content in it,
          // we need to verify there is actually an embed
          const embed = raidReportEmbeds[i];
          const embeds = embed ? [embed] : [];
          if (isRaidInstructionsMessage(m)) {
            embeds.push(this.instructionsEmbed);
          }
          return m.edit({
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
      title: INSTRUCTIONS_TITLE,
      description: `• <@&${raiderRoleId}>s may use the \`!commands\` to submit change requests.
• The bot will react with ⚠️ if the request is invalid (wrong format).
• A <@&${dkpDeputyRoleId}> will approve each request with ✅, adding it to the Raid report.
• A <@&${dkpDeputyRoleId}> will assign raid tick values using the \`/raid tick\` command.
• A <@&${dkpDeputyRoleId}> will ✅ this message to upload the raid.
• Requests made by a <@&${dkpDeputyRoleId}> are automatically approved.`,
    })
      .addField(
        "Add a name to raid ticks. Tick numbers are optional.",
        "`!add Pumped 2, 3 (ignored context)`"
      )
      .addField(
        "Remove a name from raid ticks. Tick numbers are optional.",
        "`!rem Pumped 2, 3 (ignored context)`"
      )
      .addField(
        "Replace a name on raid ticks. Tick numbers are optional.",
        "`!rep Pumped with Iceburgh 2, 3 (ignored context)`"
      );
  }

  public getRaidReportEmbeds(): MessageEmbed[] {
    const report = `${this.data.raidTicks
      .map((t) => this.renderRaidTick(t))
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

  public getTickName(tickNumber: number) {
    const tick = this.getRaidTick(tickNumber);
    return `Tick ${tickNumber}: ${tick.event || "Unknown"}`;
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
      t.attendees.splice(index, 1);
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
      t.attendees[index] = replacer;
    });
  }

  private getRaidTicks(tickNumbers: number[]): RaidTick[] {
    return (tickNumbers.length === 0 ? this.allTickNumbers : tickNumbers).map(
      (t) => this.getRaidTick(t)
    );
  }

  public updateRaidTick(
    event: string,
    value: number,
    tick?: number,
    note?: string
  ) {
    const ticks = tick ? [tick] : this.allTickNumbers;
    ticks
      .map((t) => this.getRaidTick(t))
      .forEach((t) => {
        t.event = event;
        t.value = value;
        t.note = note;
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

  private renderRaidTick(t: RaidTick) {
    const ready = t.value !== undefined && t.event !== undefined;
    const all = EVERYONE.padEnd(this.attendanceColumnLength);
    const value = `+${this.getPaddedDkp(t.value)}`;
    const loot = t.loot.length > 0 ? `\n${this.renderTickLoot(t.loot)}` : "";
    return `--- ${this.getTickName(t.tickNumber)} ---
${ready ? "+" : "-"} ${all} ${value} (Attendance)${loot}`;
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
    return `--- Attendance (${sorted.length}) ---
${sorted
  .map((name) =>
    this.renderAttendee(
      name.padEnd(this.attendanceColumnLength + DKP_COLUMN_LENGTH + 2),
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
    return s.padEnd(DKP_COLUMN_LENGTH);
  }

  private renderAttendee(attendee: string, tickNumbers: number[]): string {
    return `+ ${attendee} (${tickNumbers.join(", ")})`;
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
