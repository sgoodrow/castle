import axios from "axios";
import {
  GuildMember,
  Message,
  MessageAttachment,
  MessageEmbed,
  TextBasedChannel,
  ThreadChannel,
} from "discord.js";
import { flatMap, max, some, uniq } from "lodash";
import { raiderRoleId } from "../../config";
import { CreateRaidResponse, RaidEventData } from "../../services/castledkp";
import { code } from "../../shared/util";
import { EVERYONE, RaidTick, RaidTickData } from "./raid-tick";

export interface LootData {
  item: string;
  buyer: string;
  price: number;
  tickNumber: number;
}

interface RaidData {
  filename: string;
  ticks: RaidTickData[];
}

const RAID_REPORT_TITLE = "Raid Report";
const INSTRUCTIONS_TITLE = "Instructions";
const THREAD_EMBED_CHAR_LIMIT = 4000;
const SECOND_COLUMN_LENGTH = 6;

const isRaidReportMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_REPORT_TITLE);

export const isRaidInstructionsMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === INSTRUCTIONS_TITLE);

export const getRaidReport = async (channel: TextBasedChannel) => {
  if (!channel.isThread()) {
    throw new Error(
      "Could not find raid reports because channel is not a thread."
    );
  }

  const starter = await channel.fetchStarterMessage();
  if (!starter) {
    throw new Error(
      "Could not find raid reports because the thread starter message could not be found"
    );
  }
  const all = await channel.messages.fetch({
    after: starter.id,
    // 4 is the typical number of messages for a "very large" raid (e.g. 9 ticks on a quake)
    // 7 has some nice buffer incase something crazy happens
    // assumption: fewer = faster
    limit: 7,
  });
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

  console.log(data, a.url);

  return {
    report: new RaidReport(data),
    messages,
  };
};

export class RaidReport {
  private readonly firstColumnLength: number;
  private readonly filename: string;
  private readonly ticks: RaidTick[];

  public constructor(data: RaidData) {
    this.filename = data.filename;
    console.log(data.ticks);
    this.ticks = data.ticks.map((t) => new RaidTick(t));

    const attendanceNames = [...this.allAttendees, EVERYONE];
    this.firstColumnLength = max(attendanceNames.map((a) => a.length)) || 0;
  }

  public get allTicksHaveEvent(): boolean {
    return !some(this.allTickNumbers.map((i) => this.getRaidTick(i).hasEvent));
  }

  public async updateThreadName(channel: ThreadChannel) {
    if (channel.name !== this.threadName) {
      await channel.setName(this.threadName);
    }
  }

  public get threadName(): string {
    const emoji = some(this.ticks, (t) => !t.data.finished) ? "❔" : "✅";
    const eventAbreviations = uniq(
      this.ticks.map(({ eventAbreviation }) => eventAbreviation)
    ).join(", ");
    const label =
      eventAbreviations ||
      `${this.filename.replace(/[^a-zA-Z]+/g, "")}?` ||
      "Unidentified";
    return `${emoji} ${this.ticks[0].shortDate} ${label}`;
  }

  public getCreditCommands(): string[] {
    return flatMap(this.ticks, (t) => t.creditCommands);
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
          const embed: MessageEmbed = raidReportEmbeds[i];
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

  private get data(): RaidData {
    return {
      filename: this.filename,
      ticks: this.ticks.map((t) => t.data),
    };
  }

  public get files(): MessageAttachment[] {
    return [
      new MessageAttachment(
        Buffer.from(JSON.stringify(this.data, null, 2), "utf-8")
      )
        .setName(`${this.filename}.json`)
        .setSpoiler(true),
    ];
  }

  public get instructionsEmbed(): MessageEmbed {
    return new MessageEmbed({
      title: INSTRUCTIONS_TITLE,
      description: `• <@&${raiderRoleId}>s may use the \`!commands\` to submit change requests.
• The bot will react with ⚠️ if the request is invalid (wrong format).
• Deputies will ✅ requests to add them the raid report.
• Deputies will ✅ this message to upload the raid.
• Requests made by deputies are automatically added to the raid report.

Kill bonus values: https://tinyurl.com/CastleBossBonuses`,
    })
      .addField(
        "Add a name to raid ticks. Tick numbers and context are optional.",
        "`!add Pumped 2, 3 (context)`"
      )
      .addField(
        "Remove a name from raid ticks. Tick numbers and context are optional.",
        "`!rem Pumped 2, 3 (context)`"
      )
      .addField(
        "Replace a name on raid ticks. Tick numbers and context are optional.",
        "`!rep Pumped with Iceburgh 2, 3 (context)`"
      )
      .addField(
        `Deputies: Assign raid tick event types and values.`,
        '`/raid tick tick: "1" event: "Cazic Thule" value: "3"`'
      );
  }

  public getReceiptEmbeds(
    created: CreateRaidResponse[],
    failed: string[]
  ): MessageEmbed[] {
    const embeds = created.map(({ eventUrlSlug, id, invalidNames, tick }) =>
      tick.getCreatedEmbed(eventUrlSlug, id, invalidNames)
    );
    if (failed.length > 0) {
      embeds.push(
        new MessageEmbed({
          title: `${failed.length} ticks failed to upload.`,
          description: failed.join("\n"),
        })
      );
    }
    return embeds;
  }

  public getRaidReportEmbeds(): MessageEmbed[] {
    const report = `${this.ticks
      .map((t) => t.renderTick(this.firstColumnLength, SECOND_COLUMN_LENGTH))
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

  public async uploadRemainingRaidTicks(threadUrl: string) {
    const settled = await Promise.allSettled(
      this.ticks
        .filter((t) => !t.data.finished)
        .map((t) => t.uploadAsRaid(threadUrl))
    );

    const created: CreateRaidResponse[] = [];
    const failed: string[] = [];

    settled.forEach((s) => {
      if (s.status === "fulfilled") {
        created.push(s.value);
      } else {
        failed.push(s.reason);
      }
    });

    return { created, failed };
  }

  public addPlayer(name: string, tickNumbers: number[]) {
    this.getRaidTicks(tickNumbers).forEach((t) => t.addPlayer(name));
  }

  public removePlayer(name: string, tickNumbers: number[]) {
    this.getRaidTicks(tickNumbers).forEach((t) => t.removePlayer(name));
  }

  public replacePlayer(
    replacer: string,
    replaced: string,
    tickNumbers: number[]
  ) {
    this.getRaidTicks(tickNumbers).forEach((t) =>
      t.replacePlayer(replacer, replaced)
    );
  }

  private getRaidTicks(tickNumbers: number[]): RaidTick[] {
    return (tickNumbers.length === 0 ? this.allTickNumbers : tickNumbers).map(
      (t) => this.getRaidTick(t)
    );
  }

  public updateRaidTick(
    event: RaidEventData,
    value: number,
    tick?: number,
    note?: string
  ) {
    const tickNumbers = tick ? [tick] : this.allTickNumbers;
    tickNumbers.forEach((t) => this.getRaidTick(t).update(event, value, note));
    return tickNumbers;
  }

  private get allTickNumbers(): number[] {
    return this.ticks.map((t) => t.data.tickNumber);
  }

  private getRaidTick(tickNumber: number): RaidTick {
    const raidTick = this.ticks[tickNumber - 1];
    if (!raidTick) {
      throw new Error(`Could not find a raid tick matching ${tickNumber}`);
    }
    return raidTick;
  }

  private getAttendanceMap() {
    return this.allAttendees.reduce((m, a) => {
      m[a] = this.ticks
        .map((tick, tickIndex) => ({ tick, tickNumber: tickIndex + 1 }))
        .filter(({ tick }) => tick.data.attendees.includes(a))
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
      name.padEnd(this.firstColumnLength + SECOND_COLUMN_LENGTH + 2),
      attendanceMap[name]
    )
  )
  .join("\n")}`;
  }

  private get allAttendees() {
    return flatMap(this.ticks, (t) => t.data.attendees);
  }

  private renderAttendee(attendee: string, tickNumbers: number[]): string {
    return `+ ${attendee} (${tickNumbers.join(", ")})`;
  }
}
