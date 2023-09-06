import { GoogleSpreadsheetRow } from "google-spreadsheet";
import { publicCharactersGoogleSheetId } from "../../config";
import { SpreadsheetCache } from "../../shared/spreadsheet-cache";

enum Columns {
  Name = "Name",
  Description = "Description",
}

export interface ParkLocation {
  name: string;
  description: string;
}

class ParkLocationsCache extends SpreadsheetCache<`${Columns}`, ParkLocation> {
  public parseRow(row: GoogleSpreadsheetRow): ParkLocation {
    return {
      name: row[Columns.Name],
      description: row[Columns.Description],
    };
  }

  public getRowKey(d: ParkLocation): string | undefined {
    if (d.name && d.description) {
      return d.name;
    }
  }
}

export const parkLocationsCache = new ParkLocationsCache(
  "Bot Locations",
  publicCharactersGoogleSheetId
);
