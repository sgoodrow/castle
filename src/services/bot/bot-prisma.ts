import {
  ApplicationCommandOptionChoiceData,
  CommandInteraction,
  GuildMemberRoleManager,
  MessageComponentInteraction,
  spoiler,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  ComponentType,
} from "discord.js";
import { Moment } from "moment";
import {
  BOT_SPREADSHEET_COLUMNS,
  PublicSheetService,
} from "../sheet-updater/public-sheet";
import { IPublicAccountService } from "./public-accounts.i";
import { bot, PrismaClient } from "@prisma/client";
import moment from "moment";
import { truncate } from "lodash";
import { log } from "../../shared/logger";
import { accounts } from "../accounts";
import { Bot, SheetPublicAccountService } from "./public-accounts-sheet";
import { getMembers, prismaClient } from "../..";
import { getClassAbreviation } from "../../shared/classes";
import { raidBotInstructions } from "../../features/raid-bots/update-bots";
import { ParkBotButtonCommand } from "../../features/raid-bots/park-bot-button-command";
import { refreshBotEmbed } from "../../features/raid-bots/bot-embed";

export class PrismaPublicAccounts implements IPublicAccountService {
  private prisma!: PrismaClient;
  constructor() {
    setInterval(() => {
      this.init();
    }, 900000);
    this.init();
  }

  public async init() {
    // read sheet on startup
    log("PublicAccountsPrisma - reading sheet");
    const sheetService = new PublicSheetService();
    const rows = await sheetService.getBotSheetRows();

    // Clear data since we read initial from sheet
    log("PublicAccountsPrisma - clearing old rows");
    await prismaClient.bot.deleteMany({});
    for (const row of rows) {
      const time = moment(row[BOT_SPREADSHEET_COLUMNS.CheckoutTime]);
      const roles = await accounts.getRolesForAccount(
        row[BOT_SPREADSHEET_COLUMNS.Name]
      );

      await prismaClient.bot.create({
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

  async getBotParkButtonComponents(name: string) {
    const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      type: ComponentType.ActionRow,
      components: [],
    });
    components.push(row);

    try {
      const bot = await this.getBotByName(name);
      if (bot) {
        row.addComponents(
          new ParkBotButtonCommand(`parkbot_${name}`).getButtonBuilder(bot)
        );
      }
    } catch { }
    return components;
  }

  async doBotCheckout(
    name: string,
    interaction: MessageComponentInteraction | CommandInteraction
  ): Promise<void> {
    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }

    let status = "✅ Granted";
    try {
      const details = await accounts.getAccount(
        name,
        interaction.member?.roles as GuildMemberRoleManager
      );

      const foundBot = details.characters;

      const currentPilot = await this.getCurrentBotPilot(foundBot);

      let response = `${details.characters} (${details.purpose})
Account: ${details.accountName}
Password: ${spoiler(details.password)}

**If a bot can be moved**, and you move it, please include the location in your /bot park\n\n`;

      let components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
      if (currentPilot) {
        response += `**Please note that ${currentPilot} is marked as the pilot of ${foundBot} and you may not be able to log in. Your name will not be added as the botpilot in the public bot sheet! **\n\n`;
      } else {
        components = await this.getBotParkButtonComponents(name);
      }
      response += `The credentials for ${foundBot} have been DM'd to you. Please remember to use \`/bot park\` when you are done!`;

      await interaction.editReply({
        content: response,
        components: components,
      });
      const logMsg = await thread.send("OK");
      logMsg.edit(`${status} ${interaction.user} access to ${foundBot}`);

      if (await this.isBotPublic(foundBot)) {
        try {
          const guildUser = await interaction.guild?.members.fetch(
            interaction.user.id
          );

          log(
            `${
              guildUser?.nickname || guildUser?.user.username
            } requested ${name} and got ${details.characters} ${
              currentPilot ? `who is checked out by ${currentPilot}` : ""
            }`
          );

          if (!currentPilot) {
            await this.updateBotRowDetails(foundBot, {
              [BOT_SPREADSHEET_COLUMNS.CurrentPilot]:
                guildUser?.nickname ||
                guildUser?.user.username ||
                "UNKNOWN USER",
              [BOT_SPREADSHEET_COLUMNS.CheckoutTime]: moment().toString(),
            });
          }
        } catch (err) {
          throw new Error(
            "Failed to update public record, check the configuration"
          );
        }
      }

      await interaction.editReply(response);
    } catch (err) {
      status = "❌ Denied";
      const logMsg = await thread.send("OK");
      logMsg.edit(`${status} ${interaction.user} access to ${name}.`);

      await interaction.editReply(
        `You do not have the correct permissions to access ${name}.`
      );
      throw err;
    }
  }

  async getBotByName(botName: string): Promise<bot | null> {
    const bot = await prismaClient.bot.findFirst({
      where: {
        name: {
          contains: botName,
          mode: "insensitive",
        },
      },
    });

    return bot;
  }

  async getCurrentBotPilot(botName: string): Promise<string | undefined> {
    const bot = await this.getBotByName(botName);

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
    const bot = await prismaClient.bot.findFirst({
      where: {
        class: botClass,
        currentPilot: "",
        requiredRoles: {
          hasSome: Array.from(roles.valueOf().keys()),
        },
        ...(location
          ? { location: { equals: location, mode: "insensitive" } }
          : {}),
        ...(bindLocation
          ? { bindLocation: { equals: bindLocation, mode: "insensitive" } }
          : {}),
      },
      orderBy: {
        bindLocation: "desc",
      },
    });
    const locationString = location ? ` in ${location}` : "";
    if (bot && bot.name) {
      log(
        `PublicAccountsPrisma - found bot ${bot.name} when looking for a ${botClass}${locationString}`
      );

      bot.currentPilot = "reserved";

      await prismaClient.bot.update({
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

  async getFirstAvailableBotByLocation(
    location: string,
    roles: GuildMemberRoleManager
  ): Promise<string> {
    const bot = await prismaClient.bot.findFirst({
      where: {
        location: location,
        currentPilot: "",
        requiredRoles: {
          hasSome: Array.from(roles.valueOf().keys()),
        },
      },
      orderBy: {
        bindLocation: "desc",
      },
    });
    if (bot && bot.name) {
      log(
        `PublicAccountsPrisma - found bot ${bot.name} when looking for a bot in ${location}`
      );

      bot.currentPilot = "reserved";

      await prismaClient.bot.update({
        where: {
          name: bot.name,
        },
        data: bot,
      });

      return bot.name;
    } else {
      throw new Error(`Couldn't find an available bot in ${location}`);
    }
  }

  async getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]> {
    const bots = await this.getBots();
    return bots.map((b) => ({
      name: truncate(`${b.name} (${b.level} ${getClassAbreviation(b.class)})`, {
        length: 100,
      }),
      value: b.name,
    }));
  }

  async getBotsForBatphone(location: string): Promise<bot[]> {
    return await prismaClient.bot.findMany({
      where: {
        location: location,
        currentPilot: "",
        class: {
          not: "Mage",
        },
      },
      orderBy: [{ class: "asc" }, { name: "asc" }],
      take: 25,
    });
  }

  async isBotPublic(botName: string): Promise<boolean | undefined> {
    return (
      (await prismaClient.bot.findFirst({
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
    return await prismaClient.bot.findMany({
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
    const bot = await prismaClient.bot.findFirst({
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
      log(
        `bot-prisma: updateBotRowDetails for bot ${bot.name}. Pilot ${pilot}. location ${location} `
      );
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
      await prismaClient.bot.update({
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
    const cutoffTime = moment().subtract(hours, "hours");
    const botsToPark: Bot[] = [];
    const staleBots = await prismaClient.bot.findMany({
      where: {
        checkoutTime: {
          not: "",
        },
      },
    });

    staleBots.forEach((bot: Bot) => {
      if (bot.checkoutTime) {
        const checkoutTime = moment(bot.checkoutTime);
        if (checkoutTime.isValid()) {
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
    for (const bot of botsToPark) {
      try {
        // Try to notify the pilot, but don't let failure prevent parking
        const pilot = members.find((member) => {
          return member.nickname === bot.currentPilot;
        });
        if (pilot) {
          try {
            await pilot.send({
              content: generateMessage(bot.name, bot.checkoutTime),
            });
            log(
              `Auto-parked ${bot.name} and sent a DM to ${pilot.nickname} (${pilot.user.username})`
            );
          } catch (dmError) {
            log(
              `Auto-parked ${bot.name} but failed to DM ${pilot.nickname} (${pilot.user.username}): ${dmError}`
            );
          }
        } else {
          log(
            `Auto-parked ${bot.name} (pilot "${bot.currentPilot}" not found in server)`
          );
        }

        bot.checkoutTime = "";
        bot.currentPilot = "";

        // update db
        await prismaClient.bot.update({
          where: {
            name: bot.name,
          },
          data: bot,
        });

        // Update sheet
        try {
          await SheetPublicAccountService.getInstance().updateBotRowDetails(
            bot.name,
            {
              [BOT_SPREADSHEET_COLUMNS.CheckoutTime]: "",
              [BOT_SPREADSHEET_COLUMNS.CurrentPilot]: "",
            }
          );
        } catch (err: unknown) {
          log("Failed to update Google sheet with cleanup");
        }

        cleanupCount++;
      } catch (error) {
        log(`Failed to auto-park ${bot.name}: ${error}`);
      }
    }
    refreshBotEmbed();
    return cleanupCount;
  }

  // Legacy

  async updateBotCheckoutTime(botName: string, dateTime: Moment | null) {
    const bot = await prismaClient.bot.findFirst({
      where: {
        name: botName,
      },
    });
    if (bot && moment.isMoment(dateTime)) {
      bot.checkoutTime = dateTime.toString();
      await prismaClient.bot.update({
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
    const bot = await prismaClient.bot.findFirst({
      where: {
        name: name,
      },
    });
    if (bot) {
      log(`PublicAccountsPrisma - updating location for ${name}`);
      bot.location = location;
      prismaClient.bot.update({
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
    const bot = await prismaClient.bot.findFirst({
      where: {
        name: name,
      },
    });
    if (bot) {
      log(`PublicAccountsPrisma - updating pilot for ${name}`);
      bot.currentPilot = pilotName;
      prismaClient.bot.update({
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
