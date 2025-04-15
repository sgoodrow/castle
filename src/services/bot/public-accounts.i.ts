import {
  ApplicationCommandOptionChoiceData,
  ButtonInteraction,
  CommandInteraction,
  GuildMemberRoleManager,
  MessageComponentInteraction,
  MessageInteraction,
} from "discord.js";
import { Bot } from "./public-accounts-sheet";
import { bot, Prisma } from "@prisma/client";

export interface IPublicAccountService {
  getBotsForBatphone(location: string): Promise<bot[]>;
  cleanupCheckouts(hours: number): Promise<number>;
  updateBotLocation(name: string, location: string): void;
  updateBotPilot(botName: string, pilotName: string): void;
  updateBotCheckoutTime(botName: string, dateTime: moment.Moment | null): void;
  updateBotRowDetails(
    botName: string,
    botRowData: { [id: string]: moment.Moment | string | undefined }
  ): void;
  getCurrentBotPilot(botName: string): Promise<string | undefined>;
  getFirstAvailableBotByClass(
    botClass: string,
    roles: GuildMemberRoleManager,
    interaction: MessageComponentInteraction | CommandInteraction,
    location?: string,
    bindLocation?: string
  ): Promise<string>;
  getFirstAvailableBotByLocation(
    location: string,
    roles: GuildMemberRoleManager,
    interaction: MessageComponentInteraction | CommandInteraction
  ): Promise<string>;
  getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]>;
  isBotPublic(botName: string): Promise<boolean | undefined>;
  getBots(): Promise<Bot[]>;
  doBotCheckout(
    name: string,
    interaction: MessageComponentInteraction | CommandInteraction
  ): Promise<void>;
}
