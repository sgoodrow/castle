import { Message, MessageAttachment } from "discord.js";
import { dkpRecordsChannelId } from "../../config";
import {
  MessageAction,
  messageActionExecutor,
} from "../../shared/action/message-action";
import { read, utils, WorkSheet } from "xlsx";
import axios from "axios";
import { RaidTickFromAttachment } from "./raid-tick-from-attachment";
import { RaidReport, Attendee } from "./raid-report";
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
    const { data } = await axios({
      url: a.url,
      responseType: "arraybuffer",
    });
    const { Sheets, SheetNames } = read(data);

    const name = `${a.name?.replace("_", " - ").replace(".xlsx", "")}`;

    // create a message that will be edited to refer to the thread
    const message = await this.message.channel.send("Creating raid thread...");
    const thread = await message.startThread({
      name,
      autoArchiveDuration: 60,
    });
    await message.edit(`${thread}`);

    // parse the attachment into a raid report
    const report = new RaidReport({
      name,
      raidTicks: this.parseSheets(SheetNames, Sheets),
    });

    await thread.send({
      embeds: report.embeds,
      content: `Created by ${this.message.author}.`,
      files: report.files,
    });

    await this.message.delete();
  }

  private parseSheets(
    names: string[],
    sheets: { [sheet: string]: WorkSheet }
  ): RaidTickFromAttachment[] {
    // Throw away the redundant "Creditt & Gratss" sheet
    names.shift();
    return names
      .map((n) =>
        utils
          .sheet_to_csv(sheets[n], {
            forceQuotes: true,
            blankrows: false,
          })
          .split("\n")
      )
      .map((d, i) => new RaidTickFromAttachment(d, i + 1));
  }
}
