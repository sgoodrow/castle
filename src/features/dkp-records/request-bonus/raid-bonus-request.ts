import { GuildMember, Message, PartialMessage } from "discord.js";
import { dkpDeputyRoleId, officerRoleId } from "../../../config";
import { redisClient } from "../../../redis/client";
import { checkReactionFromClient } from "../request-revision/raid-report-revision";

export abstract class RaidBonusRequest {
  public constructor(protected readonly args: string[]) {}

  protected abstract validateArgs(): Promise<unknown>;

  protected abstract execute(raidId: number): Promise<void>;

  protected getFormatError(error: string) {
    return new Error(`Invalid "${this.constructor.name}" format, ${error}`);
  }

  public async tryExecute(
    message: PartialMessage | Message,
    actor?: GuildMember
  ) {
    if (await checkReactionFromClient(message, "✅")) {
      return;
    }

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

    // get raid id
    const raidId = await redisClient.get(message.channelId);
    if (!raidId) {
      throw new Error("Could not find raid ID");
    }

    // execute action on raid report
    try {
      await this.execute(Number(raidId));
    } catch (err) {
      await message.react("⚠️");
      return false;
    }

    // show success
    await message.react("✅");
  }
}
