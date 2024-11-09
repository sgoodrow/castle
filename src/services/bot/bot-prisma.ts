import {
  ApplicationCommandOptionChoiceData,
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
import { truncate } from "lodash";
import { log } from "console";
import { accounts } from "../accounts";
import { Bot, SheetPublicAccountService } from "./public-accounts-sheet";
import { getMembers } from "../..";
import { refreshBotEmbed } from "../../features/raid-bots/bot-embed";

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
        name: {
          equals: botName,
          mode: "insensitive",
        },
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

      bot.currentPilot = "reserved";

      await this.prisma.bot.update({
        where: {
          name: bot.name,
        },
        data: bot,
      });

      return bot.name;
    } else {
      throw new Error(
        `Couldn't find an available ${botClass}${locationString}`
      );
    }
  }

  async getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]> {
    const bots = await this.getBots();
    return bots.map((b) => ({
      name: truncate(`${b.name} (${b.level} ${b.class})`, { length: 100 }),
      value: b.name,
    }));
  }
  async isBotPublic(botName: string): Promise<boolean | undefined> {
    return (
      (await this.prisma.bot.findFirst({
        where: {
          name: {
            equals: botName,
            mode: "insensitive",
          },
        },
      })) !== null
    );
  }

  async getBots(): Promise<Bot[]> {
    return await this.prisma.bot.findMany({
      orderBy: [
        {
          class: "asc",
        },
        {
          location: "asc",
        },
        {
          name: "asc",
        },
        {
          checkoutTime: "desc",
        },
      ],
    });
  }

  async updateBotRowDetails(
    botName: string,
    botRowData: { [id: string]: string | undefined }
  ): Promise<void> {
    const bot = await this.prisma.bot.findFirst({
      where: {
        name: {
          equals: botName,
          mode: "insensitive",
        },
      },
    });

    if (bot) {
      const checkoutTime = botRowData[BOT_SPREADSHEET_COLUMNS.CheckoutTime];
      const pilot = botRowData[BOT_SPREADSHEET_COLUMNS.CurrentPilot];
      const location = botRowData[BOT_SPREADSHEET_COLUMNS.CurrentLocation];
      const bindLocation = botRowData[BOT_SPREADSHEET_COLUMNS.BindLocation];
      if (checkoutTime !== undefined) {
        // Set time or clear if not undefined
        bot.checkoutTime = botRowData[
          BOT_SPREADSHEET_COLUMNS.CheckoutTime
        ] as string;
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
          BOT_SPREADSHEET_COLUMNS.BindLocation
        ] as string;
      }
      await this.prisma.bot.update({
        where: {
          name: bot.name,
        },
        data: bot,
      });
      refreshBotEmbed();
    }

    SheetPublicAccountService.getInstance().updateBotRowDetails(
      botName,
      botRowData
    );
  }

  async cleanupCheckouts(hours: number): Promise<number> {
    const cleanupCount = 0;
    const cutoffTime = moment().subtract(hours, "hours");
    const botsToPark: Bot[] = [];
    // Could probably use a DateTime lte comparison here but the schema
    // is already a string for checkout time and I'm scared of breaking
    // prisma again
    const staleBots = await this.prisma.bot.findMany({
      where: {
        checkoutTime: {
          not: "",
        },
      },
    });

    staleBots.forEach((bot: Bot) => {
      if (bot.checkoutTime) {
        const checkoutTime = moment(bot.checkoutTime);
        if (moment.isMoment(checkoutTime)) {
          if (checkoutTime < cutoffTime) {
            botsToPark.push(bot);
          }
        }
      }
    });

    return await this.doCleanup(botsToPark, hours);
  }
  async doCleanup(botsToPark: Bot[], hours: number): Promise<number> {
    let cleanupCount = 0;
    const generateMessage = (botName: string, checkoutTime: string): string => {
      return `**Bot park notification**
${botName} has been automatically parked. You were listed as the pilot for ${botName} starting at ${checkoutTime} and
all checkouts older than ${hours} hour(s) are being cleaned up. Please remember to use /bot park to release your bot so others can use it. Thank you!

If you are still piloting ${botName}, sorry for the inconvenience and please use /bot request ${botName} to restore your checkout.`;
    };
    const members = await getMembers();
    await Promise.all(
      botsToPark.map(async (bot: Bot) => {
        const pilot = members.find((member) => {
          return member.user.username === bot.currentPilot;
        });
        if (pilot) {
          // notify offender
          await pilot.send({
            content: generateMessage(bot.name, bot.checkoutTime),
          });

          bot.checkoutTime = "";
          bot.currentPilot = "";

          // update db
          await this.prisma.bot.update({
            where: {
              name: bot.name,
            },
            data: bot,
          });

          // Update sheet
          await SheetPublicAccountService.getInstance().updateBotRowDetails(
            bot.name,
            {
              [BOT_SPREADSHEET_COLUMNS.CheckoutTime]: "",
              [BOT_SPREADSHEET_COLUMNS.CurrentPilot]: "",
            }
          );

          console.log(
            `Auto-parked ${bot.name} and sent a DM to ${pilot.user.username}`
          );

          cleanupCount++;
        }
      })
    );
    return cleanupCount;
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
