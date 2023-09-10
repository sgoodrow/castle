import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { publicCharactersGoogleSheetId } from "../../config";
import { Class } from "../../shared/classes";
import { SpreadsheetCache } from "../../shared/spreadsheet-cache";

enum Columns {
  Class = "Class",
  Name = "Name",
  Location = "Current Location",
  Level = "Level",
  Pilot = "Current Bot Pilot",
  CheckoutTime = "Date and Time (EST) of pilot login",
}

export interface RaidBot {
  class: Class;
  name: string;
  location: string;
  level: number;
  currentPilot: string;
  checkoutTime: string;
  requiredRoles?: string;
  rowIndex: number;
}

class RaidBotsCache extends SpreadsheetCache<`${Columns}`, RaidBot> {
  protected parseRow(row: GoogleSpreadsheetRow): RaidBot {
    return {
      class: row[Columns.Class].toLowerCase(),
      name: row[Columns.Name],
      level: row[Columns.Level],
      location: row[Columns.Location].toLowerCase(),
      currentPilot: row[Columns.Pilot],
      checkoutTime: row[Columns.CheckoutTime],
      rowIndex: row.rowIndex,
    };
  }

  protected getRowKey(d: RaidBot): string | undefined {
    if (d.name) {
      return d.name.toLowerCase();
    }
  }

  public updateBotLocation = async (botName: string, location: string) => {
    const row = await this.getRow("Name", botName);
    row["Current Location"] = location;
    this.saveRow(row);
  };

  public updateBotPilot = async (
    botName: string,
    pilot: string,
    time: string
  ) => {
    const row = await this.getRow("Name", botName);
    row["Current Bot Pilot"] = pilot;
    row["Date and Time (EST) of pilot login"] = time;
    this.saveRow(row);
  };
}

export const raidBotsCache = new RaidBotsCache(
  "Bot Info",
  publicCharactersGoogleSheetId
);
