import moment from "moment";
import { CreditData, CreditParser } from "./credit-parser";
import { LootData } from "../raid-report";
import { RaidTickData } from "../raid-tick";

const EQ_DATE_FORMAT = "ddd MMM DD HH:mm:ss YYYY";

/**
 * Validate that the first cell contains a bracketed date string.
 */
export const isValidXlsxData = (xlsxData: string[]): boolean => {
  if (!xlsxData.length) {
    return false;
  }
  const search = new RegExp(/\[.+?\]/g).exec(xlsxData[0]);
  return moment(search, EQ_DATE_FORMAT).isValid();
};

export class SheetParser {
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
    private readonly tickNumber: number,
    private readonly sheetName: string
  ) {}

  public get data(): RaidTickData {
    return {
      finished: false,
      // the default sheetname is a date, which isn't very useful, so throw it out
      sheetName: moment(this.sheetName, "YYYY.MM.DD hh.mm.ss A", true).isValid()
        ? "Unknown"
        : `${this.sheetName}?`,
      attendees: this.attendees,
      credits: this.credits,
      date: this.date,
      loot: this.loot,
      tickNumber: this.tickNumber,
      adjustments: [],
    };
  }

  private get date(): string {
    const logLine = this.xlsxData?.[0];
    if (!logLine) {
      throw new Error("No log lines found on sheet");
    }
    return moment(
      logLine.substring(logLine.indexOf("[") + 1, logLine.indexOf("]")),
      EQ_DATE_FORMAT
    ).toISOString();
  }

  private get credits(): CreditData[] {
    return this.xlsxData
      .filter((r) => this.getRecordType(r) === "Credit")
      .map((r) => new CreditParser(r).getCredit());
  }

  private get attendees(): string[] {
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

  private get loot(): LootData[] {
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
