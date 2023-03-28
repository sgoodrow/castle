import { GuildMember, Message, PartialMessage } from "discord.js";
import { dkpDeputyRoleId, officerRoleId } from "../../../config";
import { getRaidReport, RaidReport } from "../raid-report";

export abstract class RaidReportRevision {
  public constructor(protected readonly args: string[]) {}

  protected abstract validateArgs(): Promise<unknown>;

  protected abstract execute(raid: RaidReport): Promise<void>;

  protected getFormatError(error: string) {
    return new Error(`Invalid "${this.constructor.name}" format, ${error}`);
  }

  public async tryExecute(
    message: PartialMessage | Message,
    actor?: GuildMember
  ) {
    await this.validateArgs();

    // authorize execution
    if (
      !(
        actor?.roles.cache.has(dkpDeputyRoleId) ||
        actor?.roles.cache.has(officerRoleId)
      )
    ) {
      return false;
    }

    // get raid report
    const { report } = await getRaidReport(message.channel);

    // execute action on raid report
    try {
      await this.execute(report);
    } catch (err) {
      await message.react("⚠️");
      return false;
    }

    // save to redis cache
    await report.save(message.channelId);

    // show success
    await message.react("✅");
  }
}
