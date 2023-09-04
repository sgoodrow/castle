import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
} from "../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import { ApplicationCommandOptionChoiceData } from "discord.js";
import { truncate } from "lodash";
import { checkGoogleCredentials } from "./gdrive";
import { Class } from "../shared/classes";
import { accounts } from "./accounts";
import moment from "moment";
import { log } from "console";

enum BOT_SPREADSHEET_COLUMNS {
  Class = "Class",
  Name = "Name",
  CurrentLocation = "Current Location",
  Level = "Level",
  CurrentPilot = "Current Bot Pilot",
  CheckoutTime = "Date and Time (EST) of pilot login",
}

enum LOCATION_SPREADSHEET_COLUMNS {
  Name = "Name",
  Description = "Description",
}

const SHEET_TITLE = "Bot Info";

interface IPublicAccountService {
  updateBotLocation(name: string, location: string): void;
  updateBotPilot(botName: string, pilotName: string): void;
}

export class PublicAccountService implements IPublicAccountService {
  private sheet: GoogleSpreadsheet;
  private static instance: PublicAccountService;

  private botCache = new LRUCache<string, Bot>({
    max: 200,
    ttl: 5 * MINUTES,
  });

  private locationCache = new LRUCache<string, Location>({
    max: 200,
    ttl: 1 * MINUTES,
  });

  private constructor() {
    if (!publicCharactersGoogleSheetId) {
      throw new Error(
        "Public account sheet key not found, please set it in env file (property publicCharactersGoogleSheetId)"
      );
    }
    this.sheet = new GoogleSpreadsheet(publicCharactersGoogleSheetId);
  }

  private get botInfoSheet() {
    const match = this.sheet.sheetsByTitle[SHEET_TITLE];
    if (!match) {
      throw Error(`Could not find sheet named ${SHEET_TITLE}.`);
    }
    return match;
  }

  public static getInstance() {
    if (!PublicAccountService.instance) {
      this.instance = new PublicAccountService();
    }
    return this.instance;
  }

  public async updateBotLocation(botName: string, location: string) {
    await this.updatePublicAccountSheet(
      botName,
      BOT_SPREADSHEET_COLUMNS.CurrentLocation,
      location
    );
  }

  public async updateBotPilot(botName: string, botPilot: string) {
    await this.updatePublicAccountSheet(
      botName,
      BOT_SPREADSHEET_COLUMNS.CurrentPilot,
      botPilot
    );
  }

  public async updateBotCheckoutTime(
    botName: string,
    dateTime: moment.Moment | null
  ) {
    await this.updatePublicAccountSheet(
      botName,
      BOT_SPREADSHEET_COLUMNS.CheckoutTime,
      dateTime !== null ? dateTime.toString() : ""
    );
  }

  private async updatePublicAccountSheet(
    botName: string,
    cell: BOT_SPREADSHEET_COLUMNS,
    value: any
  ) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.botInfoSheet.getRows();
      const botRowIndex = rows.findIndex(
        (r) => r[BOT_SPREADSHEET_COLUMNS.Name] === botName
      );
      if (botRowIndex !== -1) {
        // do update
        const row = rows.at(botRowIndex);
        if (row) {
          row[cell] = value;
          await row.save();
        }
      } else {
        throw Error(`Bot ${botName} not found`);
      }
    }
  }

  public async getFirstAvailableBotByClass(
    botClass: string,
    location?: string
  ) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.botInfoSheet.getRows();
      const classRows = rows.filter((r) =>
        (r[BOT_SPREADSHEET_COLUMNS.Class] as string)?.toUpperCase() ===
              botClass.toUpperCase());
      if (classRows.length) {
        throw Error(`Could not find any classes matching ${botClass}.`);
      }
      console.log(`Looking for ${botClass} and found ${classRows.length} options.`);
      const availableClassRows = classRows.filter((r) =>
        !r[BOT_SPREADSHEET_COLUMNS.CurrentPilot]
      );
      console.log(`Looking for ${botClass} and found ${classRows.length} available.`);
      let botRowIndex = -1;
      if (location) {
        botRowIndex = availableClassRows.findIndex(
          (r) =>
            (r[BOT_SPREADSHEET_COLUMNS.CurrentLocation] as string)
              ?.toUpperCase()
              .includes(location.toUpperCase())
        );
      } else {
        botRowIndex = 0;
      }

      if (botRowIndex !== -1) {
        const row = rows.at(botRowIndex);
        if (row) {
          return row[BOT_SPREADSHEET_COLUMNS.Name];
        }
      } else {
        throw Error(`No ${botClass} was available`);
      }
    }
  }

  public async getCurrentBotPilot(
    botName: string
  ): Promise<string | undefined> {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.botInfoSheet.getRows();
      const botRowIndex = rows.findIndex(
        (r) => r[BOT_SPREADSHEET_COLUMNS.Name] === botName
      );
      if (botRowIndex !== -1) {
        // do update
        const row = rows.at(botRowIndex);
        if (row) {
          return row[BOT_SPREADSHEET_COLUMNS.CurrentPilot];
        }
      } else {
        return;
      }
    }
  }

  public async isBotPublic(botName: string) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.botInfoSheet.getRows();
      const botRowIndex = rows.findIndex(
        (r) => r[BOT_SPREADSHEET_COLUMNS.Name] === botName
      );
      return botRowIndex !== -1;
    }
  }

  public async getBotsForRole(roleId: string): Promise<Bot[]> {
    await this.loadBots();
    const allowedAccounts = await accounts.getAccountsForRole(roleId);
    // possibly a list?
    const allowedCharacters = allowedAccounts.map((acc) => acc.characters);
    const filteredBots = allowedCharacters.map((char) => this.getBot(char));
    return filteredBots;
  }

  async getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]> {
    await this.loadBots();
    const bots = this.getBots();
    return bots.map((b) => ({
      name: truncate(`${b.name} (${b.level} ${b.class})`, { length: 100 }),
      value: b.name,
    }));
  }

  private async loadBots(): Promise<void> {
    await this.authorize();
    this.botCache.purgeStale();
    if (this.botCache.size) {
      return;
    }

    await this.sheet.loadInfo();
    const rows = await this.botInfoSheet.getRows();
    rows.forEach((r) => {
      const bot: Bot = {
        class: r[BOT_SPREADSHEET_COLUMNS.Class],
        name: r[BOT_SPREADSHEET_COLUMNS.Name],
        level: r[BOT_SPREADSHEET_COLUMNS.Level],
        location: r[BOT_SPREADSHEET_COLUMNS.CurrentLocation],
        currentPilot: r[BOT_SPREADSHEET_COLUMNS.CurrentPilot],
        checkoutTime: r[BOT_SPREADSHEET_COLUMNS.CheckoutTime],
      };
      if (bot.class && bot.name && bot.location) {
        this.botCache.set(bot.name.toLowerCase(), bot);
      }
    });
    return;
  }

  private getBots(): Bot[] {
    const bots: Bot[] = [];
    for (const bot of this.botCache.values()) {
      bots.push(bot);
    }
    return bots;
  }

  private getBot(name: string): Bot {
    return this.botCache.get(name)!;
  }

  private async loadLocations(): Promise<void> {
    await this.authorize();
    this.locationCache.purgeStale();
    if (this.locationCache.size) {
      return;
    }

    await this.sheet.loadInfo();
    try {
      const locationSheet = this.sheet.sheetsByTitle["Bot Locations"];
      if (locationSheet) {
        const rows = await locationSheet.getRows();
        rows.forEach((r) => {
          const location: Location = {
            name: r[LOCATION_SPREADSHEET_COLUMNS.Name],
            description: r[LOCATION_SPREADSHEET_COLUMNS.Description],
          };
          if (location.description && location.name) {
            this.locationCache.set(location.name, location);
          }
        });
      }
    } catch (err) {
      log(
        "Failed to load location sheet data. Does it exist in the public sheet with name 'Bot Locations'?"
      );
    }
    return;
  }

  async getLocationOptions(): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > {
    await this.loadLocations();
    const locations = Array.from(this.locationCache.values());
    return locations.map((b) => ({
      name: truncate(`${b.name} - ${b.description}`, { length: 100 }),
      value: b.name,
    }));
  }

  private async authorize() {
    checkGoogleCredentials();
    if (this.sheet) {
      return this.sheet.useServiceAccountAuth({
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: (GOOGLE_PRIVATE_KEY || "")
          .split(String.raw`\n`)
          .join("\n"),
      });
    }
  }
}

export interface Bot {
  class: Class;
  name: string;
  location: string;
  level: number;
  currentPilot: string;
  checkoutTime: string;
  requiredRoles?: string;
}

export interface Location {
  name: string;
  description: string;
}
