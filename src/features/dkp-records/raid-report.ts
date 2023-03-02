import axios from "axios";
import {
  Message,
  MessageAttachment,
  MessageEmbed,
  ThreadChannel,
} from "discord.js";
import { difference, every, maxBy, range, union } from "lodash";
import { dkpDeputyRoleId } from "../../config";
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
  value?: number;
  event?: string;
  loot: Loot[];
}

const RAID_REPORT_TITLE = "Raid Report";

export const isRaidReportMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_REPORT_TITLE);

export const getRaidReport = async (channel: ThreadChannel) => {
  const messages = await channel.messages.fetch();
  const message = messages.find(isRaidReportMessage);
  if (!message) {
    throw new Error("Could not find raid report in the thread.");
  }

  const a = message.attachments.first();
  if (!a) {
    throw new Error("Could not find raid report attachment in the thread.");
  }

  const { data } = await axios({
    url: a.url,
    responseType: "json",
  });

  return {
    raidReport: new RaidReport(data),
    message,
  };
};

export class RaidReport {
  private readonly attendanceColumnLength: number;

  public constructor(
    private data: {
      name: string;
      raidTicks: RaidTick[];
      attendees: Attendee[];
    }
  ) {
    const names = this.data.attendees.map((a) => a.name);
    const longest = maxBy(names, (n) => n.length) || "";
    this.attendanceColumnLength = longest.length;
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

  public get embeds(): MessageEmbed[] {
    return [this.raidReportEmbed, this.instructionsEmbed];
  }

  public get attendees(): Attendee[] {
    return this.data.attendees;
  }

  private get instructionsEmbed(): MessageEmbed {
    return new MessageEmbed({
      title: "Raider Instructions",
      description: `Use the following commands to submit change requests. When a <@&${dkpDeputyRoleId}> confirms the change with ✅, it will be added to the Raid report.`,
    })
      .addField("Add a name to raid ticks", "`!add Pumped 2, 3`")
      .addField("Remove a name from raid ticks", "`!rem Pumped 2, 3`")
      .addField(
        "Replace a name on raid ticks",
        "`!rep Pumped on Iceburgh 2, 3`"
      );
  }

  public addPlayer(name: string, tickNumbers: number[]) {
    // if no tick numbers are provided, assume all of them are desired
    if (tickNumbers.length === 0) {
      tickNumbers = this.allTickNumbers;
    }

    // get attendee
    const attendee = this.data.attendees.find((a) => a.name === name);

    // add attendee
    if (!attendee) {
      this.data.attendees.push({
        name,
        tickNumbers,
      });
      return;
    }

    // update attendee
    attendee.tickNumbers = union(attendee.tickNumbers, tickNumbers).sort();
  }

  public removePlayer(name: string, tickNumbers: number[]) {
    // get attendee
    const i = this.data.attendees.findIndex((a) => a.name === name);
    if (i < 0) {
      throw new Error(
        `Cannot remove ${name} from ${tickNumbers} because they are not in attendance`
      );
    }
    const attendee = this.data.attendees[i];

    // remove the ticks
    attendee.tickNumbers = difference(attendee.tickNumbers, tickNumbers);

    // remove the attendee
    if (attendee.tickNumbers.length === 0) {
      this.data.attendees.splice(i, 1);
    }
  }

  public replacePlayer(
    replacer: string,
    replaced: string,
    tickNumbers: number[]
  ) {
    const i = this.data.attendees.findIndex((a) => a.name === replaced);
    if (i < 0) {
      throw new Error(
        `Cannot replace ${replaced} with ${replacer} because ${replaced} is not in attendance`
      );
    }

    this.removePlayer(replaced, tickNumbers);
    this.addPlayer(replacer, tickNumbers);
  }

  public setRaidTick(tick: number, value: number, event: string) {
    this.getRaidTick(tick).event = event;
    this.getRaidTick(tick).value = value;
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

  private get raidReportEmbed(): MessageEmbed {
    return new MessageEmbed({
      title: RAID_REPORT_TITLE,
      description: `${code}diff
${this.raidTicks}
${this.attendance}${code}`,
    });
  }

  private get raidTicks(): string {
    return this.data.raidTicks
      .map((t, i) => this.renderRaidTick(t, i))
      .join("\n\n");
  }

  private renderRaidTick(t: RaidTick, i: number) {
    const ready = t.value !== undefined && t.event !== undefined;
    const all = "All".padEnd(this.attendanceColumnLength);
    const value = `+${this.getPaddedDkp(t.value)}`;
    return `--- Tick ${i + 1} ---
${ready ? "+" : "-"} ${all} ${value} (${t.event || "Unknown Event"})
${this.renderTickLoot(t.loot)}`;
  }

  private get attendance(): string {
    return `--- Attendance ---
${this.data.attendees
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((a) =>
    this.renderAttendee(
      a.name.padEnd(this.attendanceColumnLength),
      a.tickNumbers
    )
  )
  .join("\n")}`;
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
