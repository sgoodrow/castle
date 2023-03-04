import { Message, MessageAttachment } from "discord.js";
import { dkpRecordsBetaChannelId, dkpRecordsChannelId } from "../../../config";
import {
  MessageAction,
  messageActionExecutor,
} from "../../../shared/action/message-action";
import { read, utils, WorkSheet } from "xlsx";
import axios from "axios";
import { Loot, RaidReport, RaidTick } from "../raid-report";

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

    // parse the attachment into a raid report
    const report = new RaidReport({
      name,
      raidTicks: this.parseSheets(SheetNames, Sheets),
    });

    // get the raid report embeds
    const reportEmbeds = report.getRaidReportEmbeds();
    const first = reportEmbeds.shift();
    if (!first) {
      return;
    }

    // create a message in the beta channel
    const channels = await this.message.guild?.channels.fetch();
    const betaChannel = channels?.find((c) => c.id === dkpRecordsBetaChannelId);
    if (!betaChannel?.isText()) {
      return;
    }
    const message = await betaChannel.send({
      content:
        "Creating message. When we're live, this will be the message with the XLSX file.",
    });

    // create a thread
    const thread = await message.startThread({
      name,
      autoArchiveDuration: 60,
    });

    // add files with the first report embed
    await thread.send({
      embeds: [first],
      files: report.files,
    });
    reportEmbeds.forEach(
      async (e) =>
        await thread.send({
          embeds: [e],
        })
    );

    // add an message incase additions extend the report length to another embed, put instructions in it
    await thread.send({
      embeds: [report.instructionsEmbed],
    });
  }

  private parseSheets(
    names: string[],
    sheets: { [sheet: string]: WorkSheet }
  ): SheetParser[] {
    // Throw away the unused sheet
    if (names?.[0] === "Creditt & Gratss") {
      names.shift();
    }
    return names
      .map((name) => ({
        name,
        data: utils
          .sheet_to_csv(sheets[name], {
            forceQuotes: true,
            blankrows: false,
          })
          .split("\n"),
      }))
      .map(({ data, name }, i) => new SheetParser(data, name, i + 1));
  }
}

class SheetParser implements RaidTick {
  public readonly value?: number;
  public readonly event?: string;
  public readonly attendees: string[];
  public readonly loot: Loot[];

  /**
   * List of strings. Each string may be one of the following:
   *
   * 1. a /who record: "[wed feb 15 20:10:55 2023] [anonymous] PLAYER <castle> {LEVEL CLASS}"
   * 2. a loot record: "[wed feb 15 20:11:03 2023] you say, 'loot:  ITEM PLAYER COST'"
   * 3a. creditt tell: "[wed feb 15 20:11:23 2023] PLAYER -> NINJALOOTER: creditt MESSAGE"
   * 3b. creditt tell: "[wed feb 15 21:14:22 2023] PLAYER tells you, 'creditt MESSAGE'"`,
   */
  public constructor(
    private readonly xlsxData: string[],
    public readonly name: string,
    public readonly tickNumber: number
  ) {
    this.attendees = this.getAttendees();
    this.loot = this.getLoot();
  }

  private getAttendees(): string[] {
    return this.xlsxData
      .filter((r) => this.getRecordType(r) === "Attendance")
      .map(
        (r) =>
          r
            // remove wrapping quotes
            .replace(/"/g, "")
            // remove bracketed expressions
            .replace(/\[.+?\]/g, "")
            // remove excess whitespace
            .trim()
            // get first word
            .split(" ")[0]
      );
  }

  private getLoot(): Loot[] {
    return this.xlsxData
      .filter((r) => this.getRecordType(r) === "Loot")
      .map((r) => {
        // remove wrapping quotes and get the loot text
        const loot = r.replace(/"/g, "").split("LOOT:", 2)[1];

        // remove the trailing apostrophe from the say quotation
        const words = loot
          .slice(0, loot.length - 1)
          .trim()
          .split(" ", 20);

        const price = Number(words.pop());
        const buyer = words.pop() || "Unknown";
        const item = words.join(" ");

        return {
          price,
          buyer,
          item,
          tickNumber: this.tickNumber,
        };
      })
      .filter((l) => l.price > 0);
  }

  private getRecordType(r: string) {
    if (r.includes("->") || r.includes("tells you, '")) {
      return "Credit";
    } else if (r.includes("You say, 'LOOT: ")) {
      return "Loot";
    } else {
      return "Attendance";
    }
  }
}
