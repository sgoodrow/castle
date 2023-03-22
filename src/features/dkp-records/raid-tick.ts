import { MessageEmbed } from "discord.js";
import { sumBy } from "lodash";
import moment, { Moment } from "moment";
import { castledkp, RaidEventData } from "../../services/castledkp";
import { code } from "../../shared/util";
import { CreditData } from "./create/credit-parser";
import { LootData } from "./raid-report";

export const UPLOAD_DATE_FORMAT = "YYYY-MM-DD HH:mm";
export const EVERYONE = "Everyone";

export interface RaidTickData {
  finished: boolean;
  tickNumber: number;
  sheetName: string;
  value?: number;
  event?: RaidEventData;
  note?: string;
  loot: LootData[];
  attendees: string[];
  date: string;
  credits: CreditData[];
}

export class RaidTick {
  public constructor(public readonly data: RaidTickData) {}

  public get hasEvent(): boolean {
    return !!this.data.event;
  }

  private get date(): Moment {
    return moment(this.data.date);
  }

  public get shortDate(): string {
    return this.date.format("M-D");
  }

  public get eventAbreviation(): string {
    return this.data.event?.abreviation || "";
  }

  // todo maybe truncate this with ellipses based on param (for raid reports, since note can be long)
  public get name(): string {
    return `${this.data.finished ? "✅ " : ""}${this.shortDate} ${
      this.data.event?.shortName || this.data.sheetName
    } ${this.data.tickNumber}${this.note}`;
  }

  public getUploadNote(threadUrl: string): string {
    return `${this.name} ${threadUrl}`;
  }

  public get note(): string {
    return this.data.note ? ` (${this.data.note})` : "";
  }

  public get earned(): number {
    return this.data.value === undefined
      ? 0
      : this.data.attendees.length * this.data.value;
  }

  public get uploadDate(): string {
    return this.date.format(UPLOAD_DATE_FORMAT);
  }

  public get spent(): number {
    return sumBy(this.data.loot, (l) => l.price);
  }

  public async uploadAsRaid(threadUrl: string) {
    if (this.data.finished) {
      throw new Error(`${this.name} has already been uploaded.`);
    }
    const response = await castledkp.createRaid(this, threadUrl);
    this.data.finished = true;
    return response;
  }

  public addPlayer(name: string) {
    if (!this.data.attendees.includes(name)) {
      this.data.attendees.push(name);
      this.data.attendees.sort();
    }
  }

  public removePlayer(name: string) {
    const index = this.data.attendees.indexOf(name);
    if (index < 0) {
      return;
    }
    this.data.attendees.splice(index, 1);
  }

  public replacePlayer(replacer: string, replaced: string) {
    const index = this.data.attendees.indexOf(replaced);
    if (index < 0) {
      return;
    }
    this.data.attendees[index] = replacer;
  }

  public update(event: RaidEventData, value: number, note?: string) {
    this.data.event = event;
    this.data.value = value;
    this.data.note = note;
  }

  public renderTick(firstColumnLength: number, secondColumnLength: number) {
    const ready =
      this.data.value !== undefined && this.data.event !== undefined;
    const all = EVERYONE.padEnd(firstColumnLength);
    const value = `+${this.getPaddedDkp(secondColumnLength, this.data.value)}`;
    const loot =
      this.data.loot.length > 0
        ? `\n${this.renderLoots(
            this.data.loot,
            firstColumnLength,
            secondColumnLength
          )}`
        : "";
    return `--- ${this.name} ---
${ready ? "+" : "-"} ${all} ${value} (Attendance)${loot}`;
  }

  public getCreatedEmbed(
    eventUrlSlug: string,
    id: number,
    invalidNames: string[]
  ): MessageEmbed {
    const net = this.earned - this.spent;
    const result =
      net === 0
        ? "No change to economy"
        : net > 0
        ? `+ Economy increase     ${net}`
        : `- Economy decrease     ${net}`;
    const notIncluded =
      invalidNames.length > 0
        ? `These characters were not included because they do not exist ${invalidNames.join(
            ", "
          )}`
        : "";
    return new MessageEmbed({
      title: `${this.name}`,
      description: `${code}diff
DKP Earned             ${this.earned}
DKP Spent              ${this.spent}
-------------------------------
${result}${code}${notIncluded}`,
      url: `https://castledkp.com/index.php/Raids/[green]-${eventUrlSlug}-r${id}.html?s=`,
    });
  }

  private renderLoots(
    loot: LootData[],
    firstColumnLength: number,
    secondColumnLength: number
  ): string {
    return loot
      .sort((a, b) => a.buyer.localeCompare(b.buyer))
      .map((l) => this.renderLoot(l, firstColumnLength, secondColumnLength))
      .join("\n");
  }

  private renderLoot(
    loot: LootData,
    firstColumnLength: number,
    secondColumnLength: number
  ) {
    return `+ ${loot.buyer.padEnd(firstColumnLength)} -${this.getPaddedDkp(
      secondColumnLength,
      loot.price
    )} (${loot.item})`;
  }

  public get creditCommands(): string[] {
    return this.data.credits.map((c) =>
      c.type === "UNKNOWN"
        ? `⚠️ Unparsable credit: ${c.character} said '${c.raw}' during Raid Tick ${this.data.tickNumber}`
        : c.type === "PILOT"
        ? `!rep ${c.character} with ${c.pilot} ${this.data.tickNumber}${
            c.reason ? ` (${c.reason})` : ""
          }`
        : `!add ${c.character} ${this.data.tickNumber} (${c.reason})`
    );
  }

  private getPaddedDkp(secondColumnLength: number, value?: number) {
    const s = value === undefined ? "?" : String(value);
    return s.padEnd(secondColumnLength);
  }
}
