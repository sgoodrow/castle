import { debounce } from "lodash";
import { getGuild } from "../../..";
import { redisClient } from "../../../redis/client";
import { SECONDS } from "../../../shared/time";
import { getRaidReportMessages, RaidReport } from "../raid-report";
import { openDkpService } from "../../../services/openDkpService";

// one debounce per thread, so an edit in one raid thread can't swallow another thread's update
const pendingUpdates = new Map<string, () => void>();

export const updateRaidReport = (_message: string, channel: string) => {
  const words = channel.split(".");
  const threadId = words[1];
  if (words[0] !== "raid" || !threadId) {
    return;
  }

  let update = pendingUpdates.get(threadId);
  if (!update) {
    update = debounce(() => {
      pendingUpdates.delete(threadId);
      updateThread(threadId).catch((err) =>
        console.error(`Failed to update raid report ${threadId}: ${err}`)
      );
    }, 3 * SECONDS);
    pendingUpdates.set(threadId, update);
  }
  update();
};

const updateThread = async (threadId: string) => {
  const guild = await getGuild();
  const thread = await guild.channels.fetch(threadId);

  if (!thread?.isThread()) {
    throw new Error(
      `Failed to update raid report: channel ${threadId} is not a thread`
    );
  }

  // render what is saved now rather than the published copy, which may be stale
  const serialized = await redisClient.get(threadId);
  if (!serialized) {
    return;
  }
  const report = new RaidReport(JSON.parse(serialized));
  const messages = await getRaidReportMessages(thread);

  // refill the character cache (used for class summaries) if it has expired
  await openDkpService.getCharacters().catch(() => undefined);

  await report.updateMessages(messages);
};
