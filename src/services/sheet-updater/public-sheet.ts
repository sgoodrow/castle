import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
} from "../../config";
import { checkGoogleCredentials } from "../gdrive";
import { SHEET_TITLE } from "../bot/public-accounts-sheet";
import { log } from "console";

export enum BOT_SPREADSHEET_COLUMNS {
  Class = "Class",
  Name = "Name",
  CurrentLocation = "Current Location",
  Level = "Level",
  CurrentPilot = "Current Bot Pilot",
  CheckoutTime = "Date and Time (EST) of pilot login",
  BindLocation = "Bind Location",
}

export class PublicSheetService {
  private sheet!: GoogleSpreadsheet;
  private botSheetRows!: GoogleSpreadsheetRow[];
  private locationSheetRows!: GoogleSpreadsheetRow[];

  private LOCATION_SHEET_NAME = "Bot Locations";

  constructor() {
    this.sheet = new GoogleSpreadsheet(publicCharactersGoogleSheetId);
  }

  public async getBotSheetRows() {
    await this.loadBotData();
    return this.botSheetRows;
  }

  public async getLocationRows() {
    await this.loadLocations();
    return this.locationSheetRows;
  }

  private async authorize() {
    checkGoogleCredentials();
    if (this.sheet) {
      return this.sheet.useServiceAccountAuth({
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: (GOOGLE_PRIVATE_KEY || "").split(String.raw`\n`).join("\n"),
      });
    }
  }

  private async loadBotData(): Promise<void> {
    await this.authorize();
    await this.sheet.loadInfo();

    try {
      const botInfoSheet = this.sheet.sheetsByTitle[SHEET_TITLE];
      if (botInfoSheet) {
        this.botSheetRows = await botInfoSheet.getRows();
      }
    } catch (err) {
      log(
        `Failed to load location sheet data. Does it exist in the public sheet with name '${SHEET_TITLE}'?`
      );
      return;
    }
  }

  private async loadLocations(): Promise<void> {
    await this.authorize();
    await this.sheet.loadInfo();
    try {
      const locationSheet = this.sheet.sheetsByTitle[this.LOCATION_SHEET_NAME];
      if (locationSheet) {
        this.locationSheetRows = await locationSheet.getRows();
      }
    } catch (err) {
      log(
        "Failed to load location sheet data. Does it exist in the public sheet with name 'Bot Locations'?"
      );
      return;
    }
  }
}
