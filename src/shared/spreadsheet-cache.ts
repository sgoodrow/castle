import LRUCache from "lru-cache";
import { MINUTES } from "./time";
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import { checkGoogleCredentials } from "../services/gdrive";
import { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } from "../config";

export abstract class SpreadsheetCache<ColumnNames extends string, Data> {
  private readonly cache: LRUCache<string, Data>;
  private readonly sheet: GoogleSpreadsheet;

  public constructor(
    private readonly sheetTitle: string,
    private readonly sheetId?: string
  ) {
    this.cache = new LRUCache<string, Data>({
      max: 200,
      ttl: 5 * MINUTES,
    });
    this.sheet = new GoogleSpreadsheet(this.sheetId);
  }

  public async getData() {
    this.cache.purgeStale();
    if (this.cache.size) {
      return this.cache;
    }
    const rows = await this.getRows();
    rows.forEach((r) => {
      const d: Data = this.parseRow(r);
      const key = this.getRowKey(d);
      if (key) {
        this.cache.set(key.toLowerCase(), d);
      }
    });
    return this.cache;
  }

  protected abstract parseRow(row: GoogleSpreadsheetRow): Data;

  protected abstract getRowKey(d: Data): string | undefined;

  private async getRows() {
    checkGoogleCredentials();
    await this.sheet.useServiceAccountAuth({
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join("\n"),
    });
    await this.sheet.loadInfo();
    return await this.sheet.sheetsByTitle[this.sheetTitle].getRows();
  }

  public async getRow(cellHeader: ColumnNames, value: string) {
    const rows = await this.getRows();
    const row = rows.find(
      (r) => r[cellHeader].toLowerCase() === value.toLowerCase()
    );
    if (!row) {
      throw Error(`Row with ${cellHeader}=${value} not found.`);
    }
    return row;
  }

  public async updateRowCell(
    row: GoogleSpreadsheetRow,
    cellHeader: ColumnNames,
    value: string
  ) {
    row[cellHeader] = value;
    await row.save();
    this.cache.clear();
  }
}
