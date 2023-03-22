import { debounce } from "lodash";
import { getGuild } from "../../..";
import { SECONDS } from "../../../shared/time";
import { getRaidReportMessages, RaidReport } from "../raid-report";

export const updateRaidReport = debounce(
  async (message: string, channel: string) => {
    const words = channel.split(".");
    if (words[0] !== "raid" || !words[1]) {
      return;
    }

    const guild = await getGuild();
    const thread = await guild.channels.fetch(words[1]);

    if (!thread?.isThread()) {
      throw new Error(
        `Failed to update raid report: channel ${words[1]} is not a thread`
      );
    }

    const report = new RaidReport(JSON.parse(message));
    const messages = await getRaidReportMessages(thread);

    await report.updateMessages(messages);
  },
  3 * SECONDS
);
