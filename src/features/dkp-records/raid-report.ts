import {
  Message,
  EmbedBuilder,
  TextBasedChannel,
  ThreadChannel,
} from "discord.js";
import { every, flatMap, max, uniq } from "lodash";
import { raiderRoleId } from "../../config";
import { redisChannels, redisClient } from "../../redis/client";
import { CreateRaidResponse, RaidEventData } from "../../services/castledkp";
import { DAYS } from "../../shared/time";
import { code } from "../../shared/util";
import { AdjustmentData, EVERYONE, RaidTick, RaidTickData } from "./raid-tick";
import { openDkpService } from "../../services/openDkpService";

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

const isNotEmpty = (m: Message) => !!m.embeds.find((e) => e.length === 0);

export const isRaidInstructionsMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === INSTRUCTIONS_TITLE);

export const getRaidReportMessages = async (channel: TextBasedChannel) => {
  if (!channel.isThread()) {
    throw new Error(
      "Could not find raid report messages because channel is not a thread."
    );
  }

  const starter = await channel.fetchStarterMessage();
  if (!starter) {
    throw new Error(
      "Could not find raid report messages because the thread starter message could not be found"
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
      .filter(
        (m) =>
          isRaidReportMessage(m) ||
          isRaidInstructionsMessage(m) ||
          isNotEmpty(m)
      )
      .values(),
  ];
  if (messages.length === 0) {
    throw new Error("Could not find raid report messages.");
  }
  return messages;
};

export const getRaidReport = async (channel: TextBasedChannel) => {
  const messages = await getRaidReportMessages(channel);

  const serialized = await redisClient.get(channel.id);
  if (!serialized) {
    throw new Error("Could not find raid report in database.");
  }

  return { report: new RaidReport(JSON.parse(serialized)), messages };
};

export class RaidReport {
  private readonly firstColumnLength: number;
  private readonly filename: string;
  private readonly ticks: RaidTick[];

  public constructor(data: RaidData) {
    this.filename = data.filename;
    this.ticks = data.ticks.map((t) => new RaidTick(t));

    this.firstColumnLength =
      max(
        [...this.allAttendees, ...this.allAdjustees, EVERYONE].map(
          (a) => a.length
        )
      ) || 0;
  }

  public get allTicksHaveEvent(): boolean {
    return every(this.allTickNumbers.map((i) => this.getRaidTick(i).hasEvent));
  }

  public get netDkp(): number {
    return this.ticks.reduce((s, t) => s + (t.earned - t.spent), 0);
  }

  public async tryUpdateThreadName(channel: ThreadChannel) {
    const name = this.getThreadName();
    if (channel.name === name) {
      return;
    }
    await channel.setName(name);
  }

  public get finished(): boolean {
    return every(this.ticks, (t) => t.data.finished);
  }

  public getThreadName(): string {
    const emoji = this.finished ? "✅" : this.allTicksHaveEvent ? "❕" : "❔";
    const label = every(this.ticks, (t) => t.hasEvent)
      ? uniq(this.ticks.map(({ eventAbreviation }) => eventAbreviation)).join(
          ", "
        )
      : `${this.filename.replace(/[^a-zA-Z]+/g, "")}?`;
    return `${emoji} ${this.ticks[0].shortDate} (${Math.round(this.netDkp)}) ${
      label || "Unidentified"
    }`;
  }

  public getCreditCommands(): string[] {
    return flatMap(this.ticks, (t) => t.creditCommands);
  }

  public async updateMessages(messages: Message[]) {
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
          const embed: EmbedBuilder = raidReportEmbeds[i];
          const embeds = embed ? [embed] : [];
          if (isRaidInstructionsMessage(m)) {
            embeds.push(this.instructionsEmbed);
          }
          return m.edit({
            embeds,
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

  public async save(threadId: string) {
    const serialized = JSON.stringify(this.data);
    const channel = redisChannels.raidReportChange(threadId);
    await redisClient.set(threadId, serialized, {
      EX: 90 * DAYS,
    });
    await redisClient.publish(channel, serialized);
  }

  public async tryDelete(threadId: string) {
    if (this.finished) {
      //await redisClient.del(threadId);
      await redisClient.expire(threadId, 604800);
    }
  }

  public get instructionsEmbed(): EmbedBuilder {
    return new EmbedBuilder({
      title: INSTRUCTIONS_TITLE,
      description: `• <@&${raiderRoleId}>s may use the \`!commands\` to submit change requests.
• The bot will react with ⚠️ if the request is invalid (wrong format).
• Deputies will ✅ requests to add them the raid report.
• Deputies will ✅ this message to upload the raid.
• Requests made by deputies are automatically added to the raid report.

Kill bonus values: https://castledkp.com/index.php/External/Boss-bonuses-11.html`,
    }).addFields([
      {
        name: "Add a name to raid ticks. Tick numbers and context are optional.",
        value: "`!add Matil 2, 3 (context)`",
      },
      {
        name: "Remove a name from raid ticks. Tick numbers and context are optional.",
        value: "`!rem Matil 2, 3 (context)`",
      },
      {
        name: "Replace a name on raid ticks. Tick numbers and context are optional.",
        value: "`!rep Ratburgh with Matil 2, 3 (context)`",
      },
      {
        name: "Add an adjustment to the first raid tick. Context is optional.",
        value: "`!adj Matil 5 reason (context)`",
      },
      {
        name: `Deputies: Assign raid tick event types and values.`,
        value: '`/raid tick event: "Cazic Thule" tick: "1" value: "3"`',
      },
    ]);
  }

  public getReceiptEmbeds(
    created: CreateRaidResponse[],
    failed: string[]
  ): EmbedBuilder[] {
    const embeds = created.map(
      ({ eventUrlSlug, id, invalidNames, tick }) =>
        tick.getCreatedEmbed?.(eventUrlSlug, id, invalidNames) ||
        new EmbedBuilder({})
    );
    if (failed.length > 0) {
      embeds.push(
        new EmbedBuilder({
          title: `${failed.length} problem${
            failed.length > 1 ? "s" : ""
          } with the upload.`,
          description: failed.join("\n"),
        })
      );
    }
    return embeds;
  }

  public getRaidReportEmbeds(): EmbedBuilder[] {
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
        new EmbedBuilder({
          title: RAID_REPORT_TITLE,
          description: `${code}diff
${p}${code}`,
        })
    );
  }

  public async uploadRemainingRaidTicks(threadUrl: string) {
    const failed: string[] = [];
    const created: CreateRaidResponse[] = [];

    try {
      const { errors, response } = await openDkpService.createRaidFromTicks(
        this.ticks
      );
      created.push({
        eventUrlSlug: `http://castle.opendkp.com/#/raids/${response.RaidId}`,
        id: response.RaidId || -1,
        tick: response,
        invalidNames: [],
      });
      failed.push(...errors);
    } catch (err: unknown) {
      failed.push((err as Error).toString());
      throw err;
    }

    const settled = await Promise.allSettled(
      this.ticks
        .filter((t) => !t.data.finished)
        .map((t) => t.uploadAsRaid(threadUrl))
    );

    settled.forEach((s) => {
      if (s.status === "fulfilled") {
        created.push(s.value);
      } else {
        failed.push(s.reason);
      }
    });

    return { created, failed };
  }

  public addAdjustment(adjustment: AdjustmentData) {
    this.getRaidTick(1).addAdjustment(adjustment);
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
      name.padEnd(this.firstColumnLength + SECOND_COLUMN_LENGTH + 1),
      attendanceMap[name]
    )
  )
  .join("\n")}`;
  }

  private get allAttendees() {
    return flatMap(this.ticks, (t) => t.data.attendees);
  }

  private get allAdjustees() {
    return this.getRaidTick(1).data.adjustments?.map((a) => a.player) || [];
  }

  private renderAttendee(attendee: string, tickNumbers: number[]): string {
    return `+ ${attendee} (${tickNumbers.join(", ")})`;
  }
}
