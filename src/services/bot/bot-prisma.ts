import {
  ApplicationCommandOptionChoiceData,
  GuildMember,
  GuildMemberRoleManager,
} from "discord.js";
import { Moment } from "moment";
import {
  BOT_SPREADSHEET_COLUMNS,
  PublicSheetService,
} from "../sheet-updater/public-sheet";
import { IPublicAccountService } from "./public-accounts.i";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { bind, truncate } from "lodash";
import { log } from "console";
import { In } from "typeorm";
import { accounts } from "../accounts";
import { SheetPublicAccountService } from "./public-accounts-sheet";

export class PrismaPublicAccounts implements IPublicAccountService {
  private prisma!: PrismaClient;
  constructor() {
    if (!this.prisma) {
      this.prisma = new PrismaClient();
      this.prisma.$connect();
      this.init();
    }
  }

  async init() {
    // read sheet on startup
    log("PublicAccountsPrisma - initializing (reading sheet)");
    const sheetService = new PublicSheetService();
    const rows = await sheetService.getBotSheetRows();

    // Clear data since we read initial from sheet
    log("PublicAccountsPrisma - initializing (clearing old rows)");
    await this.prisma.bot.deleteMany({});
    for (const row of rows) {
      log(
        "PublicAccountsPrisma - adding bot " + row[BOT_SPREADSHEET_COLUMNS.Name]
      );
      const time = moment(row[BOT_SPREADSHEET_COLUMNS.CheckoutTime]);
      const roles = await accounts.getRolesForAccount(
        row[BOT_SPREADSHEET_COLUMNS.Name]
      );

      await this.prisma.bot.create({
        data: {
          name: row[BOT_SPREADSHEET_COLUMNS.Name],
          class: row[BOT_SPREADSHEET_COLUMNS.Class],
          level: row[BOT_SPREADSHEET_COLUMNS.Level],
          location: row[BOT_SPREADSHEET_COLUMNS.CurrentLocation],
          checkoutTime: time.isValid() ? time.toString() : "",
          currentPilot: row[BOT_SPREADSHEET_COLUMNS.CurrentPilot],
          bindLocation: row[BOT_SPREADSHEET_COLUMNS.BindLocation],
          requiredRoles: roles.map((r) => r.id),
        },
      });
    }
  }

  async getCurrentBotPilot(botName: string): Promise<string | undefined> {
    const bot = await this.prisma.bot.findFirst({
      where: {
        name: botName,
      },
    });
    if (bot) {
      return bot.currentPilot;
    }
    return "";
  }

  async getFirstAvailableBotByClass(
    botClass: string,
    roles: GuildMemberRoleManager,
    location?: string | undefined,
    bindLocation?: string | undefined
  ): Promise<string> {
    const query = {
      where: {
        class: botClass,
        currentPilot: "",
        requiredRoles: {
          hasSome: Array.from(roles.valueOf().keys()),
        },
        ...(location ? { location: location } : {}),
        ...(bindLocation ? { bindLocation: bindLocation } : {}),
      },
    };

    const bot = await this.prisma.bot.findFirst(query);
    const locationString = location ? ` in ${location}` : "";
    if (bot && bot.name) {
      log(
        `PublicAccountsPrisma - found bot ${bot.name} when looking for a ${botClass}${locationString}`
      );

      return bot.name;
    } else {
      throw new Error(
        `Couldn't find an available ${botClass}${locationString}`
      );
    }
  }

  async getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]> {
    const bots = await this.prisma.bot.findMany();
    return bots.map((b) => ({
      name: truncate(`${b.name} (${b.level} ${b.class})`, { length: 100 }),
      value: b.name,
    }));
  }
  async isBotPublic(botName: string): Promise<boolean | undefined> {
    return (
      (await this.prisma.bot.findFirst({
        where: {
          name: botName,
        },
      })) !== null
    );
  }

  async updateBotRowDetails(
    botName: string,
    botRowData: { [id: string]: string | undefined }
  ): Promise<void> {
    const bot = await this.prisma.bot.findFirst({
      where: {
        name: botName,
      },
    });

    if (bot) {
      const checkoutTime = botRowData[BOT_SPREADSHEET_COLUMNS.CheckoutTime];
      const pilot = botRowData[BOT_SPREADSHEET_COLUMNS.CurrentPilot];
      const location = botRowData[BOT_SPREADSHEET_COLUMNS.CurrentLocation];
      const bindLocation = botRowData[BOT_SPREADSHEET_COLUMNS.BindLocation];
      if (checkoutTime !== undefined) {
        // Set time or clear if not undefined
        if (checkoutTime) {
          bot.checkoutTime = botRowData[
            BOT_SPREADSHEET_COLUMNS.CheckoutTime
          ] as string;
        }
      }
      if (pilot !== undefined) {
        bot.currentPilot = botRowData[
          BOT_SPREADSHEET_COLUMNS.CurrentPilot
        ] as string;
      }
      if (location !== undefined) {
        bot.location = botRowData[
          BOT_SPREADSHEET_COLUMNS.CurrentLocation
        ] as string;
      }
      if (bindLocation !== undefined) {
        bot.bindLocation = botRowData[
          BOT_SPREADSHEET_COLUMNS.CurrentPilot
        ] as string;
      }
      await this.prisma.bot.update({
        where: {
          name: botName,
        },
        data: bot,
      });
    }

    SheetPublicAccountService.getInstance().updateBotRowDetails(
      botName,
      botRowData
    );
  }

  // Legacy

  async updateBotCheckoutTime(botName: string, dateTime: Moment | null) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        name: botName,
      },
    });
    if (bot && moment.isMoment(dateTime)) {
      bot.checkoutTime = dateTime.toString();
      await this.prisma.bot.update({
        where: {
          name: botName,
        },
        data: bot,
      });

      // Also update the sheet
      SheetPublicAccountService.getInstance().updateBotCheckoutTime(
        botName,
        dateTime
      );
    }
  }

  async updateBotLocation(name: string, location: string) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        name: name,
      },
    });
    if (bot) {
      log(`PublicAccountsPrisma - updating location for ${name}`);
      bot.location = location;
      this.prisma.bot.update({
        where: {
          name: name,
        },
        data: bot,
      });
      log(
        `PublicAccountsPrisma - updated bot location. Name: ${name}, Location: ${location}`
      );
      // Also update the sheet
      SheetPublicAccountService.getInstance().updateBotLocation(name, location);
    } else {
      log(
        `PublicAccountsPrisma - failed to update bot location. Name: ${name}, Location: ${location}`
      );
    }
  }

  async updateBotPilot(name: string, pilotName: string) {
    const bot = await this.prisma.bot.findFirst({
      where: {
        name: name,
      },
    });
    if (bot) {
      log(`PublicAccountsPrisma - updating pilot for ${name}`);
      bot.currentPilot = pilotName;
      this.prisma.bot.update({
        where: {
          name: name,
        },
        data: bot,
      });
      log(
        `PublicAccountsPrisma - updated bot pilot. Name: ${name}, Pilot: ${pilotName}`
      );
      // Also update the sheet
      SheetPublicAccountService.getInstance().updateBotPilot(name, pilotName);
    } else {
      log(
        `PublicAccountsPrisma - failed to update bot location. Name: ${name}, Pilot: ${pilotName}`
      );
    }
  }
}
