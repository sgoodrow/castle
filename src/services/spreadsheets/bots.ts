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

interface Bot {
  class: Class;
  name: string;
  location: string;
  level: number;
  currentPilot: string;
  checkoutTime: string;
  requiredRoles?: string;
  rowIndex: number;
}

class BotsCache extends SpreadsheetCache<`${Columns}`, Bot> {
  protected parseRow(row: GoogleSpreadsheetRow): Bot {
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

  protected getRowKey(d: Bot): string | undefined {
    if (d.name) {
      return d.name.toLowerCase();
    }
  }

  public updateBotLocation = async (botName: string, location: string) => {
    const row = await this.getRow("Name", botName);
    return this.updateRowCell(row, "Current Location", location);
  };

  public updateBotPilot = async (botName: string, pilot: string) => {
    const row = await this.getRow("Name", botName);
    return this.updateRowCell(row, "Current Bot Pilot", pilot);
  };

  public updateBotCheckoutTime = async (botName: string, time: string) => {
    const row = await this.getRow("Name", botName);
    return this.updateRowCell(row, "Date and Time (EST) of pilot login", time);
  };
}

export const botsCache = new BotsCache(
  "Bot Info",
  publicCharactersGoogleSheetId
);
