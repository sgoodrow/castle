import moment from "moment";
import { Credit, CreditParser } from "./credit-parser";
import { Loot, RaidTick } from "../raid-report";

export class SheetParser implements RaidTick {
  public readonly event?: string;
  public readonly value?: number;
  public readonly attendees: string[];
  public readonly loot: Loot[];
  public readonly credits: Credit[];
  public readonly date: string;

  /**
   * List of strings. Each string may be one of the following:
   *
   * 1. a /who record: "[wed feb 15 20:10:55 2023] [anonymous] PLAYER <castle> {LEVEL CLASS}"
   * 2. a loot record: "[wed feb 15 20:11:03 2023] you say, 'loot:  ITEM PLAYER COST'"
   * 3a. creditt tell: "[wed feb 15 20:11:23 2023] PLAYER -> NINJALOOTER: creditt MESSAGE"
   * 3b. creditt tell: "[wed feb 15 21:14:22 2023] PLAYER tells you, 'creditt MESSAGE'"`,
   */
  public constructor(xlsxData: string[], public readonly tickNumber: number) {
    this.attendees = this.getAttendees(xlsxData);
    this.loot = this.getLoot(xlsxData);
    this.date = this.getDate(xlsxData);
    this.credits = this.getCredits(xlsxData);
  }

  private getDate(xlsxData: string[]): string {
    const logLine = xlsxData?.[0];
    if (!logLine) {
      throw new Error("No log lines found on sheet");
    }
    return moment(
      logLine.substring(logLine.indexOf("[") + 1, logLine.indexOf("]")),
      "ddd MMM DD HH:mm:ss YYYY"
    ).toString();
  }

  private getCredits(xlsxData: string[]): Credit[] {
    return xlsxData
      .filter((r) => this.getRecordType(r) === "Credit")
      .map((r) => new CreditParser(r).getCredit());
  }

  private getAttendees(xlsxData: string[]): string[] {
    return xlsxData
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

  private getLoot(xlsxData: string[]): Loot[] {
    return xlsxData
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
