import { GuildMember, Message, PartialMessage } from "discord.js";
import { dkpDeputyRoleId, officerRoleId } from "../../../config";
import { getRaidReport, RaidReport } from "../raid-report";

export abstract class RaidReportRevision {
  public constructor(protected readonly args: string[]) {}

  protected abstract validateArgs(): void;

  protected abstract execute(raid: RaidReport): void;

  protected getFormatError(error: string) {
    return new Error(`Invalid "${this.constructor.name}" format, ${error}`);
  }

  public async tryExecute(
    message: PartialMessage | Message,
    actor?: GuildMember
  ) {
    this.validateArgs();

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
    const { report, messages } = await getRaidReport(message.channel);

    // execute action on raid report
    this.execute(report);

    await report.editMessages(messages);

    // show success
    await message.react("✅");

    return true;
  }
}
