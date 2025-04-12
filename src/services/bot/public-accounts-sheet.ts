import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  publicCharactersGoogleSheetId,
} from "../../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../../shared/time";
import {
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
  GuildMemberRoleManager,
  MessageComponentInteraction,
} from "discord.js";
import { truncate } from "lodash";
import { checkGoogleCredentials } from "../gdrive";
import moment from "moment";
import { IPublicAccountService } from "./public-accounts.i";
import { BOT_SPREADSHEET_COLUMNS } from "../sheet-updater/public-sheet";
import { bot } from "@prisma/client";

export const SHEET_TITLE = "Bot Info";

export class SheetPublicAccountService implements IPublicAccountService {
  private sheet: GoogleSpreadsheet;
  private static instance: SheetPublicAccountService;

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
  }
  doBotCheckout(name: string, interaction: MessageComponentInteraction | CommandInteraction): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getBotsForBatphone(location: string): Promise<bot[]> {
    throw new Error("Method not implemented.");
  }
  getFirstAvailableBotByLocation(location: string, roles: GuildMemberRoleManager, interaction: MessageComponentInteraction | CommandInteraction): Promise<string> {
    throw new Error("Method not implemented.");
  }

  private get botInfoSheet() {
    const match = this.sheet.sheetsByTitle[SHEET_TITLE];
    if (!match) {
      throw Error(`Could not find sheet named ${SHEET_TITLE}.`);
    }
    return match;
  }

  public static getInstance() {
    if (!SheetPublicAccountService.instance) {
      this.instance = new SheetPublicAccountService();
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
        (r) =>
          r[BOT_SPREADSHEET_COLUMNS.Name].toLowerCase() ===
          botName.toLowerCase()
      );
      if (botRowIndex !== -1) {
        // do update
        const row = rows.at(botRowIndex);
        if (row) {
          row[cell] = value;
          await row.save();
        }
      } else {
        throw Error(`Bot ${botName} not found.`);
      }
    }
  }

  public async updateBotRowDetails(
    botName: string,
    rowDataMap: { [id: string]: moment.Moment | string | undefined }
  ) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.botInfoSheet.getRows();
      const botRowIndex = rows.findIndex(
        (r) =>
          r[BOT_SPREADSHEET_COLUMNS.Name].toLowerCase() ===
          botName.toLowerCase()
      );
      if (botRowIndex !== -1) {
        // do update
        const row = rows.at(botRowIndex);
        if (row) {
          Object.entries(rowDataMap).forEach((cellData) => {
            if (cellData[1] !== undefined) {
              row[cellData[0]] = cellData[1];
            }
          });
          await row.save();
        }
      } else {
        throw Error(`Bot ${botName} not found.`);
      }
    }
  }

  public async getFirstAvailableBotByClass(
    botClass: string,
    roles: GuildMemberRoleManager,
    interaction: MessageComponentInteraction | CommandInteraction,
    location?: string
  ) {
    await this.loadBots();
    if (this.sheet) {
      const rows = await this.botInfoSheet.getRows();
      const classRows = rows.filter(
        (r) =>
          (r[BOT_SPREADSHEET_COLUMNS.Class] as string)?.toUpperCase() ===
          botClass.toUpperCase()
      );
      if (!classRows.length) {
        throw Error(`Could not find any classes matching ${botClass}.`);
      }
      console.log(
        `Looking for ${botClass} and found ${classRows.length} options.`
      );
      const availableClassRows = classRows.filter(
        (r) => !r[BOT_SPREADSHEET_COLUMNS.CurrentPilot]
      );
      console.log(
        `Looking for ${botClass} and found ${classRows.length} available.`
      );
      const matches = location
        ? availableClassRows.filter((r) =>
            (r[BOT_SPREADSHEET_COLUMNS.CurrentLocation] as string)
              ?.toUpperCase()
              .includes(location.toUpperCase())
          )
        : availableClassRows;
      // todo: get a random match instead of first to reduce race condition assigning same bot to multiple people
      const first = matches[0];
      if (first) {
        return first[BOT_SPREADSHEET_COLUMNS.Name];
      } else {
        throw Error(`No ${botClass} was available`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cleanupCheckouts(hours: number): Promise<number> {
    throw new Error("Method not implemented.");
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
        (r) =>
          r[BOT_SPREADSHEET_COLUMNS.Name].toLowerCase() ===
          botName.toLowerCase()
      );
      return botRowIndex !== -1;
    }
  }

  async getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]> {
    await this.loadBots();
    const bots = await this.getBots();
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

  public async getBots(): Promise<Bot[]> {
    return [...this.botCache.values()];
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
  class: string;
  name: string;
  location: string;
  level: string;
  currentPilot: string;
  checkoutTime: string;
  requiredRoles?: string[];
}

export interface Location {
  name: string;
  description: string;
}
