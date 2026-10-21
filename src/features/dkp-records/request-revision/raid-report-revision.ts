import { GuildMember, Message, PartialMessage } from "discord.js";
import { dkpDeputyRoleId, officerRoleId } from "../../../config";
import { loadRaidReport, RaidReport, withRaidReportLock } from "../raid-report";

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
    const error = await withRaidReportLock(message.channelId, async () => {
      const report = await loadRaidReport(message.channelId);
      try {
        this.execute(report, args);
      } catch (err) {
        return err as Error;
      }
      await report.save(message.channelId);
    });

    if (error) {
      await message.react("⚠️");
      await message.reply(`⚠️ ${error.message ?? error}`);
      return false;
    }

    // show success
    await message.react("✅");
  }
}
