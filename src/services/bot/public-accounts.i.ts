import {
  ApplicationCommandOptionChoiceData,
  GuildMemberRoleManager,
} from "discord.js";

export interface IPublicAccountService {
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
    location?: string,
    bindLocation?: string
  ): Promise<string>;
  getBotOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]>;
  isBotPublic(botName: string): Promise<boolean | undefined>;
}
