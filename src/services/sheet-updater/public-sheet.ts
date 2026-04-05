import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
  raidValuesGoogleSheetId,
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
  Factioned = "Factioned",
}

export class PublicSheetService {
  private publicBotSheet!: GoogleSpreadsheet;
  private raidValuesSheet!: GoogleSpreadsheet;
  private botSheetRows!: GoogleSpreadsheetRow[];
  private locationSheetRows!: GoogleSpreadsheetRow[];
  private raidValueRows!: GoogleSpreadsheetRow[];

  private LOCATION_SHEET_NAME = "Bot Locations";
  private RAID_VALUES_SHEET = "Data";

  constructor() {
    this.publicBotSheet = new GoogleSpreadsheet(publicCharactersGoogleSheetId);
    this.raidValuesSheet = new GoogleSpreadsheet(raidValuesGoogleSheetId);
    this.authorize();
  }

  public async getBotSheetRows() {
    await this.loadBotData();
    return this.botSheetRows;
  }

  public async getLocationRows() {
    await this.loadLocations();
    return this.locationSheetRows;
  }

  public async getRaidValueRows() {
    await this.loadRaidValues();
    return this.raidValueRows;
  }

  private async authorize() {
    checkGoogleCredentials();
    if (this.publicBotSheet) {
      this.publicBotSheet.useServiceAccountAuth({
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: (GOOGLE_PRIVATE_KEY || "")
          .split(String.raw`\n`)
          .join("\n"),
      });
    }
    if (this.raidValuesSheet) {
      this.raidValuesSheet.useServiceAccountAuth({
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: (GOOGLE_PRIVATE_KEY || "")
          .split(String.raw`\n`)
          .join("\n"),
      });
    }
  }

  private async loadBotData(): Promise<void> {
    await this.authorize();
    await this.publicBotSheet.loadInfo();

    try {
      const botInfoSheet = this.publicBotSheet.sheetsByTitle[SHEET_TITLE];
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
    await this.publicBotSheet.loadInfo();
    try {
      const locationSheet = this.publicBotSheet.sheetsByTitle[this.LOCATION_SHEET_NAME];
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

  private async loadRaidValues(): Promise<void> {
    await this.authorize();
    await this.raidValuesSheet.loadInfo();
    try {
      const raidValuesSheet = this.raidValuesSheet.sheetsByTitle[this.RAID_VALUES_SHEET];
      if (raidValuesSheet) {
        this.raidValueRows = await raidValuesSheet.getRows();
      }
    } catch (err) {
      log(
        "Failed to load raid values sheet data. Does it exist in the raid values sheet with name 'Data'?"
      );
      return;
    }
  }
}
