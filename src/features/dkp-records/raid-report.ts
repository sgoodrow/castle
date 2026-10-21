import {
  Message,
  EmbedBuilder,
  embedLength,
  TextBasedChannel,
  ThreadChannel,
} from "discord.js";
import {
  capitalize,
  chunk,
  compact,
  every,
  flatMap,
  max,
  sum,
  uniq,
} from "lodash";
import { raiderRoleId } from "../../config";
import { redisChannels, redisClient } from "../../redis/client";
import { CreateRaidResponse, RaidEventData } from "../../services/castledkp";
import { DAYS } from "../../shared/time";
import { code, isEqDkpPlusEnabled } from "../../shared/util";
import { AdjustmentData, EVERYONE, RaidTick, RaidTickData } from "./raid-tick";
import {
  odkpCharacterCache,
  openDkpService,
} from "../../services/openDkpService";
import { RaidValue } from "../../services/raidValuesService";
import { PilotCredit } from "./create/pilot-checks";

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
const CLASS_SUMMARY_TITLE = "Class Summary";
const THREAD_EMBED_CHAR_LIMIT = 4000;
// Discord caps all the embeds in one message at 6000 characters together; keep a little spare
const MESSAGE_EMBEDS_CHAR_LIMIT = 5900;
const SECOND_COLUMN_LENGTH = 6;
// a botpilot's replaced bots after the first wrap onto lines of their own, this many to a line
const BOTS_PER_LINE = 2;

const isRaidReportMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === RAID_REPORT_TITLE);

const isNotEmpty = (m: Message) => !!m.embeds.find((e) => e.length === 0);

export const isRaidInstructionsMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === INSTRUCTIONS_TITLE);

const isClassSummaryMessage = (m: Message) =>
  !!m.embeds.find((e) => e.title === CLASS_SUMMARY_TITLE);

const paginate = (lines: string[]): string[] => {
  const pages: string[] = [""];
  lines.forEach((line) => {
    if (pages[pages.length - 1].length + line.length > THREAD_EMBED_CHAR_LIMIT) {
      pages.push("");
    }
    pages[pages.length - 1] += `\n${line}`;
  });
  return pages;
};

const reportEmbed = (page: string) =>
  new EmbedBuilder({
    title: RAID_REPORT_TITLE,
    description: `${code}diff
${page}${code}`,
  });

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
    // plus the class summary; 8 has some nice buffer incase something crazy happens
    // assumption: fewer = faster
    limit: 8,
  });
  const messages = [
    ...all
      .reverse()
      .filter(
        (m) =>
          isRaidReportMessage(m) ||
          isRaidInstructionsMessage(m) ||
          isClassSummaryMessage(m) ||
          isNotEmpty(m)
      )
      .values(),
  ];
  if (messages.length === 0) {
    throw new Error("Could not find raid report messages.");
  }
  return messages;
};

const reportLocks = new Map<string, Promise<unknown>>();

/**
 * Runs read-modify-write edits of one thread's report one at a time. Without this, two
 * approvals that land together each save their own copy and one silently undoes the other.
 */
export const withRaidReportLock = async <T>(
  threadId: string,
  edit: () => Promise<T>
): Promise<T> => {
  const run = (reportLocks.get(threadId) ?? Promise.resolve())
    .catch(() => undefined)
    .then(edit);
  const tail = run.catch(() => undefined);
  reportLocks.set(threadId, tail);
  try {
    return await run;
  } finally {
    if (reportLocks.get(threadId) === tail) {
      reportLocks.delete(threadId);
    }
  }
};

/**
 * The saved report alone, with no Discord or OpenDKP calls. Edits use this inside
 * withRaidReportLock, which runs one at a time, so a slow call here delays every queued ✅.
 */
export const loadRaidReport = async (threadId: string) => {
  const serialized = await redisClient.get(threadId);
  if (!serialized) {
    throw new Error("Could not find raid report in database.");
  }
  return new RaidReport(JSON.parse(serialized));
};

/** The saved report plus its messages, for callers that render it themselves. */
export const getRaidReport = async (channel: TextBasedChannel) => {
  const messages = await getRaidReportMessages(channel);

  // refill the character cache (used for class summaries) if it has expired
  await openDkpService.getCharacters().catch(() => undefined);

  return { report: await loadRaidReport(channel.id), messages };
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
    return `${emoji} ${this.ticks[0].shortDate} (${Math.round(this.netDkp)}) ${label || "Unidentified"
      }`;
  }

  public getCreditCommands(): string[] {
    return flatMap(this.ticks, (t) => t.creditCommands);
  }

  public get pilotCredits(): PilotCredit[] {
    return flatMap(this.ticks, (t) => t.data.credits).flatMap((c) =>
      c.type === "PILOT" ? [{ bot: c.character, pilot: c.pilot }] : []
    );
  }

  public async updateMessages(messages: Message[]) {
    const classSummaryMessages = messages.filter(isClassSummaryMessage);
    const reportMessages = messages.filter((m) => !isClassSummaryMessage(m));
    const instructionsLength = embedLength(this.instructionsEmbed.toJSON());
    const raidReportEmbeds = this.getRaidReportMessageEmbeds(
      reportMessages.map((m) =>
        isRaidInstructionsMessage(m) ? instructionsLength : 0
      )
    );

    try {
      await Promise.all([
        ...classSummaryMessages.map((m) =>
          m.edit({ embeds: [this.classSummaryEmbed] })
        ),
        ...reportMessages.map((m, i) => {
          const embeds = [...raidReportEmbeds[i]];
          if (isRaidInstructionsMessage(m)) {
            embeds.push(this.instructionsEmbed);
          }
          return m.edit({
            embeds,
          });
        }),
      ]);
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

Kill bonus values: https://docs.google.com/spreadsheets/d/1cZdD1HOtDutOvxkEp0-upfx5qyY4C-pfaME7VM7ou40/edit?gid=131422595#gid=131422595`,
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
          title: `${failed.length} problem${failed.length > 1 ? "s" : ""
            } with the upload.`,
          description: failed.join("\n"),
        })
      );
    }
    return embeds;
  }

  /** Posted below the raid report, so the ticks themselves stay compact. */
  public get classSummaryEmbed(): EmbedBuilder {
    return new EmbedBuilder({ title: CLASS_SUMMARY_TITLE }).addFields(
      this.ticks.map((t) => ({
        name: `${t.name} · ${t.data.attendees.length} attending`,
        value: `${code}
${t.renderClasses((name) => this.getClass(name))}${code}`,
      }))
    );
  }

  /** One embed per message, as the report is first posted. */
  public getRaidReportEmbeds(): EmbedBuilder[] {
    return paginate(this.reportLines).map(reportEmbed);
  }

  /**
   * The report's embeds for each of the thread's report messages, given how many characters each
   * message's other embeds already use (e.g. the instructions). The thread can't gain messages above
   * the credit !commands, so as the report grows it fills each message up to Discord's limit rather
   * than needing more 4000-character pages than it was posted with. Every message gets a share.
   */
  public getRaidReportMessageEmbeds(reserved: number[]): EmbedBuilder[][] {
    const lines = this.reportLines;
    // a message's lines are split into at most two embeds, each with a title and code block
    const overhead = 2 * embedLength(reportEmbed("").toJSON());
    const capacities = reserved.map(
      (r) => MESSAGE_EMBEDS_CHAR_LIMIT - r - overhead
    );
    const size = (line: string) => line.length + 1;
    let remaining = sum(lines.map(size));
    let next = 0;
    const embeds = capacities.map((capacity, i) => {
      const later = sum(capacities.slice(i + 1));
      const target = Math.max(
        Math.ceil(remaining / (capacities.length - i)),
        remaining - later
      );
      const taken: string[] = [];
      let length = 0;
      while (
        next < lines.length &&
        length < target &&
        length + size(lines[next]) <= capacity
      ) {
        taken.push(lines[next]);
        length += size(lines[next]);
        next++;
      }
      remaining -= length;
      return taken.length > 0 ? paginate(taken).map(reportEmbed) : [];
    });
    if (next < lines.length) {
      throw new Error(
        `The raid report is too long for its ${reserved.length} messages`
      );
    }
    return embeds;
  }

  private get reportLines(): string[] {
    return `${this.ticks
      .map((t) => t.renderTick(this.firstColumnLength, SECOND_COLUMN_LENGTH))
      .join("\n\n")}

${this.attendance}`.split("\n");
  }

  public async uploadRemainingRaidTicks(threadUrl: string) {
    const failed: string[] = [];
    const created: CreateRaidResponse[] = [];

    try {
      const { errors, response } = await openDkpService.createRaidFromTicks(
        this.ticks,
        threadUrl
      );
      created.push({
        eventUrlSlug: `http://castle.opendkp.com/#/raids/${response.RaidId}`,
        id: response.RaidId || -1,
        tick: response,
        invalidNames: [],
      });
      this.ticks.forEach((t) => (t.data.finished = true));
      failed.push(...errors);
    } catch (err: unknown) {
      failed.push((err as Error).toString());
      throw err;
    }

    if (isEqDkpPlusEnabled()) {
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
    }

    return { created, failed };
  }

  public addAdjustment(adjustment: AdjustmentData) {
    this.getRaidTick(1).addAdjustment(adjustment);
  }

  public addPlayer(name: string, tickNumbers: number[]) {
    this.getRaidTicks(tickNumbers).forEach((t) => t.addPlayer(name));
  }

  public removePlayer(name: string, tickNumbers: number[]) {
    const ticks = this.getRaidTicks(tickNumbers);
    this.assertInAttendance(name, ticks, tickNumbers.length > 0);
    ticks.forEach((t) => t.removePlayer(name));
  }

  public replacePlayer(
    replacer: string,
    replaced: string,
    tickNumbers: number[]
  ) {
    const ticks = this.getRaidTicks(tickNumbers);
    // re-approving a !rep that already went through (e.g. its ✅ was slow to show)
    // is a no-op rather than a "not in attendance" error
    const pending = ticks.filter((t) => !t.hasReplacement(replaced, replacer));
    const named = tickNumbers.length > 0;
    if (named || pending.length === ticks.length) {
      this.assertInAttendance(replaced, pending, named);
    }
    pending.forEach((t) => t.replacePlayer(replacer, replaced));
  }

  /**
   * Without this, a typo'd !rem or !rep silently changes nothing but is still approved.
   * Named ticks must all include the player; with no ticks named, at least one must.
   */
  private assertInAttendance(name: string, ticks: RaidTick[], named: boolean) {
    const missing = ticks.filter((t) => !t.hasPlayer(name));
    if (!named && missing.length === ticks.length) {
      throw new Error(`${name} is not in attendance on any tick`);
    }
    if (named && missing.length > 0) {
      throw new Error(
        `${name} is not in attendance on tick ${missing
          .map((t) => t.data.tickNumber)
          .join(", ")}`
      );
    }
  }

  public getEventForTick(tickNumber: number) {
    const tick = this.getRaidTick(tickNumber);
    if (tick && tick.data.event) {
      return tick.data.event;
    }
  }

  private getRaidTicks(tickNumbers: number[]): RaidTick[] {
    return (tickNumbers.length === 0 ? this.allTickNumbers : tickNumbers).map(
      (t) => this.getRaidTick(t)
    );
  }

  public updateRaidTick(
    event: RaidValue,
    value: number,
    tick?: number,
    note?: string,
    eqDkpEvent?: RaidEventData
  ) {
    const tickNumbers = tick ? [tick] : this.allTickNumbers;
    tickNumbers.forEach((t) =>
      this.getRaidTick(t).update(event, value, note, eqDkpEvent)
    );
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
    const labels = sorted.map((name) => this.labelAttendee(name));
    // botpilot labels like "Iceburgh [Pumped]" can be longer than any name
    const width = Math.max(
      this.firstColumnLength + SECOND_COLUMN_LENGTH + 1,
      ...labels.map(([first]) => first.length)
    );
    return `--- Attendance (${sorted.length}) ---
${sorted
        .flatMap((name, i) => {
          const [first, ...more] = labels[i];
          // further bots line up under the first, without the tick numbers
          const indent = " ".repeat(name.length + 1);
          return [
            this.renderAttendee(first.padEnd(width), attendanceMap[name]),
            ...more.map((bots) => `+ ${indent}${bots}`),
          ];
        })
        .join("\n")}`;
  }

  /**
   * Prefer the class from the sheet's /who lines, which covers bots and anonymous
   * players. Fall back to OpenDKP for players added later via !add or !rep.
   */
  private getClass(name: string): string | undefined {
    for (const t of this.ticks) {
      const cls = t.data.classes?.[name];
      if (cls) {
        return cls;
      }
    }
    return odkpCharacterCache.get(capitalize(name))?.Class;
  }

  /**
   * The attendee's lines, e.g. ["Iceburgh [Pumped]"] when Iceburgh replaced their bot Pumped, or
   * ["Iceburgh [Pumped]", "[Zapped, Buffed]", "[Healed]"] when they replaced four, so a botpilot's
   * bots don't widen every line of the attendance.
   */
  private labelAttendee(name: string): [string, ...string[]] {
    const [first, ...more] = uniq(
      compact(this.ticks.map((t) => t.getReplaced(name)))
    );
    if (!first) {
      return [name];
    }
    return [
      `${name} [${first}]`,
      ...chunk(more, BOTS_PER_LINE).map((bots) => `[${bots.join(", ")}]`),
    ];
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
