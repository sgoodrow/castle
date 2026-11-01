import { GuildMember, Message, PartialMessage } from "discord.js";
import { dkpDeputyRoleId, officerRoleId } from "../../../config";
import {
  findRaidReport,
  loadRaidReport,
  RaidReport,
  withRaidReportLock,
} from "../raid-report";
import {
  describeChanges,
  findReceiptRaidId,
  findUploadedRaidId,
  reportOfRaid,
  threadUrl,
  updateUploadedRaid,
} from "../uploaded-raid";

/** Reads the cached reaction, which Discord keeps current, rather than fetching its users. */
export const hasReactionFromClient = (
  message: PartialMessage | Message,
  emojiName: string
) =>
  !!message.reactions.cache.find((r) => r.emoji.name === emojiName)?.me;

export interface PlayerArgs {
  player: string;
  tickNumbers: number[];
}

// messages whose approval is still running, so a second ✅ before the bot's ✅ shows can't apply it twice
const approving = new Set<string>();

export abstract class RaidReportRevision<Args> {
  public constructor(protected readonly args: string[]) {}

  /** May call OpenDKP, so it runs once, before the report is locked. */
  protected abstract validateArgs(): Promise<Args>;

  /** Runs while the report is locked, so it can't wait on anything. */
  protected abstract execute(raid: RaidReport, args: Args): void;

  /** The players whose attendance the edit sets, which an uploaded raid is updated to match. */
  protected abstract attendees(args: Args): string[];

  protected getFormatError(error: string) {
    return new Error(`Invalid "${this.constructor.name}" format, ${error}`);
  }

  public async tryExecute(
    message: PartialMessage | Message,
    actor?: GuildMember
  ) {
    if (hasReactionFromClient(message, "✅")) {
      return;
    }
    const args = await this.validateArgs();

    // authorize execution
    if (
      !(
        actor?.roles.cache.has(dkpDeputyRoleId) ||
        actor?.roles.cache.has(officerRoleId)
      )
    ) {
      return false;
    }

    if (approving.has(message.id)) {
      return;
    }
    approving.add(message.id);
    try {
      return await this.apply(message, args);
    } finally {
      approving.delete(message.id);
    }
  }

  private async apply(message: PartialMessage | Message, args: Args) {
    // get, edit and save the raid report without interleaving other edits
    const edited = await withRaidReportLock(message.channelId, async () => {
      const report = await findRaidReport(message.channelId);
      if (!report) {
        return undefined;
      }
      try {
        this.execute(report, args);
      } catch (err) {
        return err as Error;
      }
      await report.save(message.channelId);
      return report;
    });

    // an uploaded thread is archived, and the bot can't react or reply in it until it's reopened
    const channel = message.channel;
    if (channel.isThread() && channel.archived) {
      await channel.setArchived(false);
    }

    if (edited === undefined) {
      return await this.applyWithoutReport(message, args);
    }

    if (edited instanceof Error) {
      await message.react("⚠️");
      await message.reply(`⚠️ ${edited.message ?? edited}`);
      return false;
    }

    // once the raid is uploaded, the edit goes to OpenDKP too
    let uploaded: string | undefined;
    try {
      uploaded = await this.updateUploadedRaid(message, edited, args);
    } catch (err) {
      await message.react("⚠️");
      await message.reply(
        `⚠️ The raid report is updated, but the uploaded OpenDKP raid couldn't be, so please change it on OpenDKP: ${
          (err as Error).message ?? err
        }`
      );
      return false;
    }

    // show success, and what changed on the uploaded raid
    await message.react("✅");
    if (uploaded) {
      await message.reply(uploaded);
    }
  }

  /**
   * The thread's report has expired. If the thread was uploaded, the edit goes straight to its
   * OpenDKP raid, applied to the raid's ticks as they are there, and the reply says what changed,
   * since there's no report to redraw.
   */
  private async applyWithoutReport(
    message: PartialMessage | Message,
    args: Args
  ) {
    const raidId = await this.findUploadedRaid(message);
    if (raidId === undefined) {
      throw new Error("Could not find raid report in database.");
    }
    const names = this.attendees(args);
    let uploaded: string;
    try {
      if (names.length === 0) {
        throw new Error(
          "This thread's raid report has expired, so please make this change on OpenDKP"
        );
      }
      const result = await updateUploadedRaid(raidId, names, (raid) => {
        const report = reportOfRaid(raid);
        this.execute(report, args);
        return report;
      });
      uploaded = this.describeUploaded(raidId, result);
    } catch (err) {
      await message.react("⚠️");
      await message.reply(`⚠️ ${(err as Error).message ?? err}`);
      return false;
    }
    await message.react("✅");
    await message.reply(
      `${uploaded}\nThis thread's raid report has expired, so it isn't redrawn.`
    );
  }

  /** Updates the OpenDKP raid if the report was uploaded. Returns what to tell the deputies. */
  private async updateUploadedRaid(
    message: PartialMessage | Message,
    report: RaidReport,
    args: Args
  ): Promise<string | undefined> {
    const names = this.attendees(args);
    if (names.length === 0) {
      return undefined;
    }
    const raidId =
      report.uploadedRaidId ?? (await this.findOlderUpload(message));
    if (raidId === undefined) {
      return undefined;
    }
    return this.describeUploaded(
      raidId,
      await updateUploadedRaid(raidId, names, () => report)
    );
  }

  private describeUploaded(
    raidId: number,
    { changes, unregistered }: Awaited<ReturnType<typeof updateUploadedRaid>>
  ): string {
    return [
      ...(changes.length > 0 ? [describeChanges(raidId, changes)] : []),
      ...(unregistered.length > 0
        ? [
            `⚠️ ${unregistered.join(", ")} ${
              unregistered.length > 1
                ? "aren't OpenDKP characters"
                : "isn't an OpenDKP character"
            }, so the uploaded raid leaves them off.`,
          ]
        : []),
    ].join("\n");
  }

  /**
   * A thread uploaded before reports kept their raid id is named with a ✅. Finds its raid and
   * remembers it.
   */
  private async findOlderUpload(
    message: PartialMessage | Message
  ): Promise<number | undefined> {
    const raidId = await this.findUploadedRaid(message);
    if (raidId === undefined) {
      return undefined;
    }
    await withRaidReportLock(message.channelId, async () => {
      const saved = await loadRaidReport(message.channelId);
      saved.markUploaded(raidId);
      await saved.save(message.channelId);
    });
    return raidId;
  }

  /**
   * An uploaded thread is named with a ✅. Its raid is the one the bot's upload receipt in the
   * thread links to, or else the one whose name ends with the thread's link.
   */
  private async findUploadedRaid(
    message: PartialMessage | Message
  ): Promise<number | undefined> {
    const channel = message.channel;
    if (!channel.isThread() || !channel.name.startsWith("✅")) {
      return undefined;
    }
    const raidId =
      (await findReceiptRaidId(channel, message.client.user.id)) ??
      (await findUploadedRaidId(threadUrl(channel.guildId, channel.id)));
    if (raidId === undefined) {
      throw new Error("Could not find the OpenDKP raid this thread was uploaded as");
    }
    return raidId;
  }
}
