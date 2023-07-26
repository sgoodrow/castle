import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
  publicCharactersSheetCleanupInterval,
  publicCharactersStaleTime,
} from "../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import { ApplicationCommandOptionChoiceData } from "discord.js";
import { truncate } from "lodash";
import { checkGoogleCredentials } from "./gdrive";
import { Class } from "../shared/classes";
import { accounts } from "./accounts";
import moment from "moment";

enum SPREADSHEET_COLUMNS {
  Class = "Class",
  Name = "Name",
  CurrentLocation = "Current Location",
  Level = "Level",
  CurrentPilot = "Current Bot Pilot",
  CheckoutTime = "Date and Time (EST) of pilot login",
}

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

  private constructor() {
    if (!publicCharactersGoogleSheetId) {
      throw new Error(
        "Public account sheet key not found, please set it in env file (property publicCharactersGoogleSheetId)"
      );
    }
    this.sheet = new GoogleSpreadsheet(publicCharactersGoogleSheetId);
    this.startStaleCheckoutCleanup();
  }

  private async startStaleCheckoutCleanup() {
    const interval = Number.parseInt(
      publicCharactersSheetCleanupInterval ?? "15"
    );
    setInterval(async () => {
      await this.loadBots();
      if (this.sheet) {
        const rows = await this.sheet.sheetsByIndex[0].getRows();
        rows.forEach(async (row) => {
          const checkoutTime = moment(row[SPREADSHEET_COLUMNS.CheckoutTime]);
          if (checkoutTime.isValid()) {
            // Compare with now
            if (
              checkoutTime.diff(moment(), "minutes") >
              Number.parseInt(publicCharactersStaleTime ?? "240")
            ) {
              // Notify user
              const user = row[SPREADSHEET_COLUMNS.CurrentPilot];

              // Update sheet
              row[SPREADSHEET_COLUMNS.CheckoutTime] = "";
              row[SPREADSHEET_COLUMNS.CurrentPilot] = "";
              await row.save();
            }
          }
        });
      }
    }, interval);
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
      SPREADSHEET_COLUMNS.CurrentLocation,
      location
    );
  }

  public async updateBotPilot(botName: string, botPilot: string) {
    await this.updatePublicAccountSheet(
      botName,
      SPREADSHEET_COLUMNS.CurrentPilot,
      botPilot
    );
  }

  public async updateBotCheckoutTime(
    botName: string,
    dateTime: moment.Moment | null
  ) {
    await this.updatePublicAccountSheet(
      botName,
      SPREADSHEET_COLUMNS.CheckoutTime,
      dateTime !== null ? dateTime.toString() : ""
    );
  }

  private async updatePublicAccountSheet(
    botName: string,
    cell: SPREADSHEET_COLUMNS,
    value: string
  ) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.sheet.sheetsByIndex[0].getRows();
      const botRowIndex = rows.findIndex(
        (r) => r[SPREADSHEET_COLUMNS.Name] === botName
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
      const rows = await this.sheet.sheetsByIndex[0].getRows();
      let botRowIndex = -1;
      if (location) {
        botRowIndex = rows.findIndex(
          (r) =>
            r[SPREADSHEET_COLUMNS.Class] &&
            (r[SPREADSHEET_COLUMNS.Class] as string).toUpperCase() ===
              botClass.toUpperCase() &&
            !r[SPREADSHEET_COLUMNS.CurrentPilot] &&
            (r[SPREADSHEET_COLUMNS.CurrentLocation] as string)
              .toUpperCase()
              .includes(location.toUpperCase())
        );
      } else {
        botRowIndex = rows.findIndex(
          (r) =>
            r[SPREADSHEET_COLUMNS.Class] &&
            (r[SPREADSHEET_COLUMNS.Class] as string).toUpperCase() ===
              botClass.toUpperCase() &&
            !r[SPREADSHEET_COLUMNS.CurrentPilot]
        );
      }

      if (botRowIndex !== -1) {
        const row = rows.at(botRowIndex);
        if (row) {
          return row[SPREADSHEET_COLUMNS.Name];
        }
      } else {
        throw Error(`No ${botClass} was available`);
      }
    }
  }

  public async getCurrentBotPilot(botName: string) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.sheet.sheetsByIndex[0].getRows();
      const botRowIndex = rows.findIndex(
        (r) => r[SPREADSHEET_COLUMNS.Name] === botName
      );
      if (botRowIndex !== -1) {
        // do update
        const row = rows.at(botRowIndex);
        if (row) {
          return row[SPREADSHEET_COLUMNS.CurrentPilot];
        }
      } else {
        throw Error(`Bot ${botName} not found`);
      }
    }
  }

  public async isBotPublic(botName: string) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.sheet.sheetsByIndex[0].getRows();
      const botRowIndex = rows.findIndex(
        (r) => r[SPREADSHEET_COLUMNS.Name] === botName
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

  async getOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]> {
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
    const rows = await this.sheet.sheetsByIndex[0].getRows();
    rows.forEach((r) => {
      const bot: Bot = {
        class: r[SPREADSHEET_COLUMNS.Class],
        name: r[SPREADSHEET_COLUMNS.Name],
        level: r[SPREADSHEET_COLUMNS.Level],
        location: r[SPREADSHEET_COLUMNS.CurrentLocation],
        currentPilot: r[SPREADSHEET_COLUMNS.CurrentPilot],
        checkoutTime: r[SPREADSHEET_COLUMNS.CheckoutTime],
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

const CHECKED = "TRUE";

interface Role {
  name: string;
  id: string;
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
