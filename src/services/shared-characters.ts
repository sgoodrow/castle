import {
  ApplicationCommandOptionChoiceData,
  GuildMemberRoleManager,
} from "discord.js";
import { some, truncate } from "lodash";
import { Account, accountsCache } from "./spreadsheets/accounts";
import { botsCache } from "./spreadsheets/bots";
import moment from "moment";
import { parkLocationsCache } from "./spreadsheets/park-locations";

export const sharedCharacters = {
  getAllowedAccountsForRole: async (roleId: string): Promise<Account[]> => {
    const accounts = await accountsCache.getData();
    return [...accounts.values()].filter((c) =>
      c.requiredRoles.map((r) => r.id).includes(roleId)
    );
  },

  getAccountOptions: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const accounts = await accountsCache.getData();
    return [...accounts.values()].map((c) => ({
      name: truncate(
        `${c.characters} - ${c.purpose} (${c.requiredRoles
          .map((r) => r.name)
          .join(", ")})`,
        {
          length: 100,
        }
      ),
      value: c.characters,
    }));
  },

  getAccount: async (
    name: string,
    roles: GuildMemberRoleManager
  ): Promise<Account> => {
    const accounts = await accountsCache.getData();
    const d = accounts.get(name.toLowerCase());
    if (!d) {
      throw new Error(`${name} is not a shared account`);
    }
    const hasRole = some(
      d.requiredRoles.map((r) => r.id).map((id) => roles.cache.has(id))
    );
    if (!hasRole) {
      throw new Error(`You do not have the required role to access ${name}`);
    }
    return d;
  },

  updateBotLocation: async (botName: string, location: string) => {
    await botsCache.updateBotLocation(botName, location);
  },

  updateBotPilot: async (botName: string, pilot: string) => {
    await botsCache.updateBotPilot(botName, pilot);
  },

  updateBotCheckoutTime: async (
    botName: string,
    time: moment.Moment | null
  ) => {
    const value = time?.toString() || "";
    await botsCache.updateBotCheckoutTime(botName, value);
  },

  getFirstAvailableBotByClass: async (botClass: string, location?: string) => {
    const bots = await botsCache.getData();
    const classBots = [...bots.values()].filter(
      (b) => b.class === botClass.toLowerCase()
    );
    if (!classBots.length) {
      throw Error(`Could not find any classes matching ${botClass}.`);
    }
    console.log(
      `Looking for ${botClass} and found ${classBots.length} options.`
    );
    const availableClassBots = classBots.filter((b) => !b.currentPilot);
    console.log(
      `Looking for ${botClass} and found ${availableClassBots.length} available.`
    );
    const matches = location
      ? availableClassBots.filter((b) =>
          b.location.includes(location.toLowerCase())
        )
      : availableClassBots;
    if (!matches.length) {
      throw Error(`No ${botClass}s available.`);
    }
    // todo: get a random match instead of first to reduce race condition assigning same bot to multiple people
    return matches[0].name;
  },

  getCurrentBotPilot: async (botName: string) => {
    const bots = await botsCache.getData();
    return [...bots.values()].find((b) => b.name === botName.toLowerCase())
      ?.currentPilot;
  },

  isBot: async (botName: string) => {
    const bots = await botsCache.getData();
    return !!bots.get(botName);
  },

  getBotOptions: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const bots = await botsCache.getData();
    return [...bots.values()].map((b) => ({
      name: truncate(`${b.name} (${b.level} ${b.class})`, { length: 100 }),
      value: b.name,
    }));
  },

  getParkOptions: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const parkLocations = await parkLocationsCache.getData();
    return [...parkLocations.values()].map((b) => ({
      name: truncate(`${b.name} - ${b.description}`, { length: 100 }),
      value: b.name,
    }));
  },
};
