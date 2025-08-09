import { Message, Attachment } from "discord.js";
import { dkpDeputyRoleId, dkpRecordsChannelId } from "../../../config";
import { MessageAction, messageActionExecutor } from "../../../shared/action/message-action";
import { read, utils, WorkSheet } from "xlsx";
import axios from "axios";
import { RaidReport } from "../raid-report";
import { addRoleToThread } from "../../../shared/command/util";
import { isValidXlsxData, SheetParser } from "./sheet-parser";

const supportedFormat = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

  private async tryCreateRaidThread(a: Attachment) {
    const { data } = await axios({
      url: a.url,
      responseType: "arraybuffer",
    });
    const { Sheets, SheetNames } = read(data);

    const filename = a.name?.replace(".xlsx", "") || "raid";

    // parse the attachment into a raid report
    const ticks = this.parseSheets(SheetNames, Sheets);
    const report = new RaidReport({
      filename,
      ticks,
    });

    // get the raid report embeds
    const reportEmbeds = report.getRaidReportEmbeds();
    const first = reportEmbeds.shift();
    if (!first) {
      return;
    }

    // create a thread
    const thread = await this.message.startThread({
      name: report.getThreadName(),
      autoArchiveDuration: 4320,
    });

    // save report to redis
    await report.save(thread.id);

    // add files with the first report embed
    await thread.send({
      embeds: [first],
    });
    reportEmbeds.forEach(
      async (e) =>
        await thread.send({
          embeds: [e],
        })
    );

    // always end with a message containing the instructions embed
    // this message can be used for raid report overflow from add actions
    await thread.send({
      embeds: [report.instructionsEmbed],
    });

    // add credit messages
    await Promise.all(report.getCreditCommands().map((content) => thread.send({ content })));

    // add deputies to thread
    await addRoleToThread(dkpDeputyRoleId, thread);
  }

  private parseSheets(names: string[], sheets: { [sheet: string]: WorkSheet }) {
    // Throw away the unused sheet
    if (names?.[0] === "Creditt & Gratss") {
      names.shift();
    }
    return names
      .map((name) => ({
        data: utils
          .sheet_to_csv(sheets[name], {
            forceQuotes: true,
            blankrows: false,
          })
          .split("\n"),
        name,
      }))
      .filter(({ data }) => isValidXlsxData(data))
      .map(({ data, name }, i) => new SheetParser(data, i + 1, name).data);
  }
}
