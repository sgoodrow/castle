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
import { BOT_SPREADSHEET_COLUMNS } from "../sheet-updater/public-sheet";
import { IPublicAccountService } from "./public-accounts.i";
import { bot, PrismaClient } from "@prisma/client";
import moment from "moment";
import { truncate } from "lodash";
import { log } from "../../shared/logger";
import { accounts } from "../accounts";
import { Bot, SheetPublicAccountService } from "./public-accounts-sheet";
import { getMember, getMembers, prismaClient, publicSheetService } from "../..";
import { getClassAbreviation } from "../../shared/classes";
import { raidBotInstructions } from "../../features/raid-bots/update-bots";
import { ParkBotButtonCommand } from "../../features/raid-bots/park-bot-button-command";
import { refreshBotEmbed } from "../../features/raid-bots/bot-embed";
import { code } from "../../shared/util";
import { MINUTES } from "../../shared/time";
import { noBotsRoleId, noBotWizardsRoleId } from "../../config";
import { Class } from "../../shared/classes";
import { BotSheetAlerts } from "./bot-sheet-alerts";

type SheetRow = Record<string, string> & { rowIndex: number };

// What's wrong with the sheet's rows, if anything: a bot needs a name and a class, and each name
// once, since a bot is requested by name. Blank rows are fine.
export function badBotRows(rows: SheetRow[]) {
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const name = row[BOT_SPREADSHEET_COLUMNS.Name]?.trim() ?? "";
    const where = `Row ${row.rowIndex}${name ? ` (${name})` : ""}`;
    if (!name && !row[BOT_SPREADSHEET_COLUMNS.Class]?.trim()) continue; // a blank row
    if (!name) bad.push(`${where}: no name`);
    else if (!row[BOT_SPREADSHEET_COLUMNS.Class]?.trim())
      bad.push(`${where}: no class`);
    else if (seen.has(name.toLowerCase()))
      bad.push(`${where}: the name is on an earlier row too`);
    seen.add(name.toLowerCase());
  }
  return bad;
}

export class PrismaPublicAccounts implements IPublicAccountService {
  private refreshing: boolean = false;
  private isReady: boolean = false;
  private alerts = new BotSheetAlerts();
  private loadFailed = false; // the last load of the sheet failed

  constructor() {
    this.startRefreshLoop();
  }

  private async startRefreshLoop() {
    await this.refreshOrLog();
    this.isReady = true;
    // Every 15 minutes, or every minute while the last load failed, so a fixed sheet is picked
    // up quickly.
    let lastTry = Date.now();
    setInterval(async () => {
      if (this.refreshing) return;
      if (!this.loadFailed && Date.now() - lastTry < 15 * MINUTES - MINUTES / 2)
        return;
      lastTry = Date.now();
      await this.refreshOrLog();
    }, MINUTES);
  }

  // A failed refresh keeps the bot data already in the database and is retried
  // on the next tick; it must not leave guardReady waiting forever.
  private async refreshOrLog() {
    try {
      await this.refresh();
      this.loadFailed = false;
      await this.alerts.loaded();
    } catch (err) {
      this.loadFailed = true;
      log(`FAILED - Refreshing bot data: ${err}`);
      await this.alerts.failed(err);
    }
  }

  private async refresh() {
    this.refreshing = true;
    log("START - Refreshing bot data");
    try {
      await accounts.refreshAccountData();
      await this.init();
      log("END - Refreshing bot data");
    } finally {
      this.refreshing = false;
    }
  }

  public async guardReady() {
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    while (!this.isReady || this.refreshing) {
      await sleep(100);
    }
    // Bot commands stop, rather than run on bots that may be out of date.
    if (this.loadFailed)
      throw new Error(
        `The "Bot Info" sheet couldn't be loaded, so bot commands are off. A knight needs to fix the sheet and restart the bot.`
      );
  }

  // Replaces the stored bots with the sheet's, all at once, so a failure part way keeps the old
  // ones. A bad row fails the whole load, saying which rows to fix.
  public async init() {
    log("PublicAccountsPrisma - reading sheet");
    const rows = await publicSheetService.getBotSheetRows();
    const bad = badBotRows(rows);
    if (bad.length)
      throw new Error(
        `these rows need fixing:\n${bad.map((b) => `• ${b}`).join("\n")}`
      );
    const bots = [];
    for (const row of rows) {
      // Google Sheets leaves out a row's blank cells after its last filled one.
      const cell = (column: BOT_SPREADSHEET_COLUMNS) => row[column] ?? "";
      // Named as badBotRows checks them: a padded name is still the bot's name.
      const name = cell(BOT_SPREADSHEET_COLUMNS.Name).trim();
      if (!name) continue; // a blank row
      // A blank checkout time is stored blank, not as now: moment(undefined) is now.
      const time = moment(cell(BOT_SPREADSHEET_COLUMNS.CheckoutTime));
      const roles = await accounts.getRolesForAccount(name);
      bots.push({
        name,
        class: cell(BOT_SPREADSHEET_COLUMNS.Class).trim(),
        level: cell(BOT_SPREADSHEET_COLUMNS.Level),
        location: cell(BOT_SPREADSHEET_COLUMNS.CurrentLocation),
        checkoutTime: time.isValid() ? time.toString() : "",
        currentPilot: cell(BOT_SPREADSHEET_COLUMNS.CurrentPilot),
        bindLocation: cell(BOT_SPREADSHEET_COLUMNS.BindLocation),
        factioned: cell(BOT_SPREADSHEET_COLUMNS.Factioned) !== "",
        faction: cell(BOT_SPREADSHEET_COLUMNS.Faction),
        requiredRoles: roles.map((r) => r.id),
      });
    }
    log("PublicAccountsPrisma - replacing stored bots");
    await prismaClient.$transaction([
      prismaClient.bot.deleteMany({}),
      prismaClient.bot.createMany({ data: bots }),
    ]);
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
    } catch {}
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
      const roles = interaction.member?.roles as GuildMemberRoleManager;
      if (roles.cache.has(noBotsRoleId)) {
        throw new Error("You do not have permission to request bots");
      }

      const details = await accounts.getAccount(
        name,
        interaction.member?.roles as GuildMemberRoleManager
      );

      const foundBot = details.characters;
      const prismaBot = await this.getBotByName(foundBot);
      if (
        prismaBot?.class === Class.Wizard &&
        roles.cache.has(noBotWizardsRoleId)
      ) {
        throw new Error("You do not have permission to request Wizard bots");
      }
      const currentPilot = await this.getCurrentBotPilot(foundBot);

      const factionWarning = `${code}diff
- FACTIONED CHARACTER WARNING
- BY PLAYING THIS CHARACTER YOU AGREE TO NOT TAKE ANY FACTION HITS. RAID LEADERSHIP RESERVES THE RIGHT TO RECOUP THE COSTS OF REFACTIONING THE BOT OR DOCK DKP, BASED ON THE DIFFICULTY OF REFACTIONING
${code}`;

      let response = `${prismaBot?.factioned ? factionWarning : ""}
${details.characters} (${details.purpose})
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
      response += `${prismaBot?.factioned ? factionWarning : ""}`;

      await interaction.editReply({
        content: response,
        components: components,
      });
      const logMsg = await thread.send("OK");
      logMsg.edit(`${status} ${interaction.user} access to ${foundBot}`);

      if (await this.isBotPublic(foundBot)) {
        try {
          const guildUser = await getMember(interaction.user.id);

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
        `You do not have the correct permissions to access ${name} - ${err}`
      );
      throw err;
    }
  }

  async getBotByName(botName: string): Promise<bot | null> {
    await this.guardReady();
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
    await this.guardReady();
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
    await this.guardReady();
    if (botClass === Class.Wizard && roles.cache.has(noBotWizardsRoleId)) {
      throw new Error(`You do not have permission to request a ${botClass}`);
    }
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
    await this.guardReady();
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
    await this.guardReady();
    return await prismaClient.bot.findMany({
      where: {
        location: location,
        currentPilot: "",
      },
      orderBy: [{ class: "asc" }, { name: "asc" }],
    });
  }

  async isBotPublic(botName: string): Promise<boolean | undefined> {
    await this.guardReady();
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
    await this.guardReady();
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
    await this.guardReady();
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
      const faction = botRowData[BOT_SPREADSHEET_COLUMNS.Faction];
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
      if (faction !== undefined) {
        bot.faction = botRowData[BOT_SPREADSHEET_COLUMNS.Faction] as string;
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
    await this.guardReady();
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
    await this.guardReady();
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
    await this.guardReady();
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
    await this.guardReady();
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
