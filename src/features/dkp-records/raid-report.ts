import { Message, MessageEmbed, ThreadChannel } from "discord.js";
import { difference, every, maxBy, union } from "lodash";
import { dkpDeputyRoleId } from "../../config";
import { code } from "../../shared/util";

export interface Loot {
  item: string;
  buyer: string;
  price: number;
  tickNumber: number;
}

export const RAID_REPORT_TITLE = "Raid Report";

const dkpPadding = 6;

interface RaidTick {
  value?: number;
  event?: string;
}

interface Attendee {
  name: string;
  tickNumbers: number[];
}

interface Data {
  raidTicks: RaidTick[];
  attendees: Attendee[];
  loot: Loot[];
}

export const multipleSpaces = /\s+/;
const parenthetical = /\(([^)]+)\)/;

/**
 * @param a Some example attendee strings:
 * - Someone     ? (1, 2)
 * + SomeoneElse 4 (1)
 */
const parseAttendee = (a: string): Attendee => {
  const name = a.split(multipleSpaces)[1];
  const tickNumbers = parenthetical.exec(a)?.[1].split(", ").map(Number) || [];
  return {
    name,
    tickNumbers,
  };
};

/**
 * @param l Example loot strings. The parenthetical is the tick number, not the count.
 * + Someone      -3   Jade Reaver (1)
 * + SomeoneElse  -2   Spell: Bedlam (2)
 */
const parseLoot = (l: string): Loot => {
  const words = l.split(multipleSpaces);
  const tickNumber = Number(words.pop()?.replace("(", "").replace(")", ""));
  const buyer = words[1];
  const price = Number(words[2].slice(1));
  const item = l.slice(l.indexOf(words[3]));

  return {
    buyer,
    price,
    item,
    tickNumber,
  };
};

/**
 * @param t Some example tick strings:
 * + Tick1 ? (?)
 * - Tick1 ? (?)
 * + Tick3 2 (vox)
 */
const parseRaidTick = (t: string): RaidTick => {
  const words = t.split(multipleSpaces);
  const value = words[2] === "?" ? undefined : Number(words[2]);
  const event = parenthetical.exec(t)?.[1];
  return {
    value,
    event,
  };
};

export const isRaidReportMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_REPORT_TITLE);

export const getRaidReport = async (channel: ThreadChannel) => {
  const messages = await channel.messages.fetch();
  const message = messages.find(isRaidReportMessage);
  if (!message) {
    throw new Error("Could not find raid report in the thread.");
  }

  const report = message.embeds.find(
    (e) => e.title === RAID_REPORT_TITLE
  )?.description;

  if (!report) {
    throw new Error("Could not find raid report in the thread.");
  }

  // parse raid report
  const lines = report.split("\n");
  lines.shift(); // drop the raid ticks header
  const attendanceHeader = lines.findIndex((l) => l.includes("- Attendance"));
  const lootHeader = lines.findIndex((l) => l.includes("- Loot"));

  const raidTicks = lines
    .slice(1, attendanceHeader - 1)
    .map((t) => parseRaidTick(t));
  const attendees = lines
    .slice(attendanceHeader + 1, lootHeader - 1)
    .map((a) => parseAttendee(a));
  const loot = lines
    .slice(lootHeader + 1, lines.length - 1)
    .map((l) => parseLoot(l));

  return {
    raid: new RaidReport({
      raidTicks,
      attendees,
      loot,
    }),
    message,
  };
};

export class RaidReport {
  public constructor(private data: Data) {}

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
    // get attendee
    const attendee = this.data.attendees.find((a) => a.name === name);
    if (!attendee) {
      // add new attendee
      this.data.attendees.push({
        name,
        tickNumbers,
      });
    } else {
      // update attendee
      attendee.tickNumbers = union(attendee.tickNumbers, tickNumbers).sort();
    }
  }

  public removePlayer(name: string, tickNumbers: number[]) {
    // get attendee
    const i = this.data.attendees.findIndex((a) => a.name === name);
    if (i < 0) {
      throw new Error(
        `Cannot remove ${name} from ${tickNumbers} because they are not in attendance`
      );
      return;
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

  private getRaidTick(tick: number): RaidTick {
    const raidTick = this.data.raidTicks[tick - 1];
    if (!raidTick) {
      throw new Error(`Could not find a raid tick matching ${tick}`);
    }
    return raidTick;
  }

  private get raidReportEmbed(): MessageEmbed {
    const raidTickValues = this.getRaidTickValues();
    const attendance = this.getAttendance();
    const loot = this.getLoot();
    return new MessageEmbed({
      title: RAID_REPORT_TITLE,
      description: `${code}diff
${raidTickValues}

${attendance}

${loot}${code}`,
    });
  }

  private getRaidTickValues(): string {
    return `--- Raid Ticks ---                               
${this.data.raidTicks.map((t, i) => this.renderRaidTick(t, i)).join("\n")}`;
  }

  private renderRaidTick(t: RaidTick, i: number) {
    const ready = t.value !== undefined && t.event !== undefined;
    return `${ready ? "+" : "-"} Tick${i + 1} ${t.value || "?"} (${
      t.event || "?"
    })`;
  }

  private getAttendance(): string {
    const padding = this.getAttendeePadding();
    return `--- Attendance ---
${this.data.attendees
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((a) => this.renderAttendee(a.name.padEnd(padding), a.tickNumbers))
  .join("\n")}`;
  }

  private renderAttendee(attendee: string, tickNumbers: number[]): string {
    const ticks = tickNumbers.map((i) => this.getRaidTick(i));
    const dkp = ticks.reduce(
      (s, t) => (t.value !== undefined ? s + t.value : s),
      0
    );
    const calculatable = every(ticks, (t) => t.value !== undefined);
    return `${calculatable ? "+" : "-"} ${attendee} ${
      calculatable
        ? `+${dkp}`.padEnd(dkpPadding + 1)
        : " ?".padEnd(dkpPadding + 1)
    } (${tickNumbers.join(", ")})`;
  }

  private getLoot(): string {
    const padding = this.getAttendeePadding();
    return `--- Loot ---
${this.data.loot
  .sort((a, b) => a.buyer.localeCompare(b.buyer))
  .map((l) => this.renderLoot(l, padding))
  .join("\n")}
    `;
  }

  private renderLoot(loot: Loot, padding: number) {
    return `+ ${loot.buyer.padEnd(padding)} -${String(loot.price).padEnd(
      dkpPadding
    )} ${loot.item}`;
  }

  private getAttendeePadding(): number {
    const names = this.data.attendees.map((a) => a.name);
    const longest = maxBy(names, (n) => n.length) || "";
    return longest.length;
  }
}
