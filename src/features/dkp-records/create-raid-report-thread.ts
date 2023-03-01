import { Message, MessageAttachment } from "discord.js";
import { dkpRecordsChannelId } from "../../config";
import {
  MessageAction,
  messageActionExecutor,
} from "../../shared/action/message-action";
import { read, utils } from "xlsx";
import axios from "axios";
import { RaidTickFromAttachment } from "./raid-tick-from-attachment";
import { RaidReport } from "./raid-report";
import { flatMap } from "lodash";

const supportedFormat =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const tryCreateRaidReportThreadAction = (message: Message) =>
  messageActionExecutor(new CreateRaidReportThreadMessageAction(message));

class CreateRaidReportThreadMessageAction extends MessageAction {
  public async execute() {
    // filter channel
    if (this.message.channel.id !== dkpRecordsChannelId) {
      return;
    }

    // filter non-attachments
    if (this.message.attachments.size === 0) {
      return;
    }

    // parse xlsx attachments
    await Promise.all(
      [...this.message.attachments.values()]
        .filter((a) => a.contentType === supportedFormat)
        .map((a) => this.tryCreateRaidThread(a))
    );
  }

  private async tryCreateRaidThread(a: MessageAttachment) {
    const { data } = await axios({ url: a.url, responseType: "arraybuffer" });
    const { Sheets, SheetNames } = read(data);

    const name = `${a.name?.replace("_", " - ").replace(".xlsx", "")}`;

    // create a message that will be edited to refer to the thread
    const message = await this.message.channel.send("Creating raid thread...");
    const thread = await message.startThread({
      name,
      autoArchiveDuration: 60,
    });
    await message.edit(`${thread}`);

    // Throw away the redundant "Creditt & Gratss" sheet
    SheetNames.shift();

    // Parse each remaining sheet as a raid tick, composed of rows of attendance, loot and credit data
    const raidTickData = SheetNames.map((n) =>
      utils
        .sheet_to_csv(Sheets[n], {
          forceQuotes: true,
          blankrows: false,
        })
        .split("\n")
    );

    // Parse the attachment for raid tick data
    const ticks = raidTickData.map(
      (d, i) => new RaidTickFromAttachment(d, i + 1)
    );

    // Get attendees, this could probably be simpler
    const attendance = flatMap(ticks, (r) => r.attendees).reduce((m, a) => {
      m[a] = ticks.filter((t) => t.attendees.includes(a));
      return m;
    }, {} as { [attendee: string]: RaidTickFromAttachment[] });
    const attendees = Object.entries(attendance).map(([name, ticks]) => ({
      name,
      tickNumbers: ticks.map((t) => t.tickNumber),
    }));

    await thread.send({
      embeds: new RaidReport({
        attendees,
        loot: flatMap(ticks, (t) => t.loot),
        raidTicks: ticks,
      }).embeds,
      content: `Created by ${this.message.author}.`,
      files: [a],
    });

    await this.message.delete();
  }
}
