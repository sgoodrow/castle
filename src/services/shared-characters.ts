import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  spoiler,
} from "discord.js";
import { some, truncate } from "lodash";
import { Account, accountsCache } from "./spreadsheets/accounts";
import { RaidBot, raidBotsCache } from "./spreadsheets/raid-bots";
import moment from "moment";
import { parkLocationsCache } from "./spreadsheets/park-locations";
import { Mutex } from "async-mutex";
import { raidBotInstructions } from "../features/raid-bots/update-bots";

const assertUnreachable = (x: never): never => {
  throw new Error(`Didn't expect to get here with ${x}`);
};

const mutex = new Mutex();

// Used for retrieving an account by character name which may or may not be a raid bot.
type TakeAccountByCharacterName = {
  type: "byName";
  characterName: string;
  interaction: CommandInteraction<CacheType>;
};

// Used for retrieving an account for a raid bot by class and location.
type TakeAccountByRaidBotClass = {
  type: "byClass";
  raidBotClass: string;
  raidBotLocation?: string;
  interaction: CommandInteraction<CacheType>;
};

type TakeAccount = TakeAccountByCharacterName | TakeAccountByRaidBotClass;

class AccessDeniedError extends Error {
  constructor(public readonly botName: string) {
    super(`Access denied for character ${botName}.`);
    Object.setPrototypeOf(this, AccessDeniedError.prototype);
  }
}

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
      throw new AccessDeniedError(name);
    }
    return d;
  },

  getAccountByRaidBotClass: async (
    take: TakeAccountByRaidBotClass
  ): Promise<Account> => {
    const botClass = take.raidBotClass;
    const location = take.raidBotLocation;
    const bots = await raidBotsCache.getData();

    // Filter by class
    const classBots = [...bots.values()]
      .filter((b) => b.class.toLowerCase() === botClass.toLowerCase())
      .sort((a, b) => a.rowIndex - b.rowIndex);
    if (!classBots.length) {
      throw Error(`Could not find any classes matching ${botClass}.`);
    }
    console.log(
      `Looking for ${botClass} and found ${classBots.length} total bots.`
    );

    // Filter by available
    const availableClassBots = classBots.filter((b) => !b.currentPilot);
    console.log(
      `Looking for ${botClass} and found ${availableClassBots.length} available bots.`
    );

    // Filter by location, select first bot
    let botName: string | undefined = undefined;
    if (location) {
      botName = availableClassBots.filter((b) =>
        b.location.includes(location.toLowerCase())
      )[0]?.name;
      if (!botName) {
        throw Error(`No ${botClass}s available in ${location}.`);
      }
    }
    // Select first bot
    else {
      botName = availableClassBots[0]?.name;
      if (!botName) {
        throw Error(`No ${botClass}s available.`);
      }
    }

    // Get account
    return await sharedCharacters.getAccount(
      botName,
      take.interaction.member?.roles as GuildMemberRoleManager
    );
  },

  updateBotLocation: async (botName: string, location: string) => {
    await raidBotsCache.updateBotLocation(botName, location);
  },

  takeAccount: async (take: TakeAccount) => {
    const thread = await raidBotInstructions.getThread();
    if (!thread) {
      throw new Error(`Could not locate bot request thread.`);
    }

    const release = await mutex.acquire();

    // Get the account
    let account: Account | undefined;
    let raidBot: RaidBot | undefined;
    let credentialsMessage = "";
    let raidBotMessage = "";
    try {
      switch (take.type) {
        case "byName":
          account = await sharedCharacters.getAccount(
            take.characterName,
            take.interaction.member?.roles as GuildMemberRoleManager
          );
          break;
        case "byClass":
          account = await sharedCharacters.getAccountByRaidBotClass(take);
          break;
        default:
          assertUnreachable(take);
          break;
      }

      // Check that there's an account
      if (!account) {
        throw new Error("Failed to get any account details.");
      }

      // Setup the direct message
      credentialsMessage += `**Assigned:** ${account.characters} (${
        account.purpose
      })
**Account:** ${account.accountName}
**Password:** ${spoiler(account.password)}`;

      // If its a raid bot, update the pilot
      raidBot = await sharedCharacters.getRaidBot(account);
      if (raidBot) {
        await sharedCharacters.updateBotPilot(
          raidBot,
          take.interaction.user.username,
          moment()
        );

        if (raidBot.currentPilot) {
          raidBotMessage += `\n\nYour name has NOT been added as the bot pilot because ${raidBot.currentPilot} is currently using it. You may not be able to log in.`;
        } else {
          raidBotMessage += `\n\nYour name has been added as the bot pilot along with a timestamp. Please us \`/bot park\` when you're finished to remove yourself as the current pilot.`;
        }
      }
    } catch (err) {
      if (err instanceof AccessDeniedError) {
        // Send audit message
        const message = await thread.send("OK");
        await message.edit(
          `❌ Denied ${take.interaction.user} access to ${err.botName}.`
        );
      }
      throw err;
    } finally {
      release();
    }

    // Send direct message
    const directMessage = credentialsMessage + raidBotMessage;
    await take.interaction.user.send(directMessage);

    // Send audit message
    const message = await thread.send("OK");
    await message.edit(
      `✅ Granted ${take.interaction.user} access to ${account.characters}.`
    );

    // Send command response
    await take.interaction.editReply("Bot request processed." + raidBotMessage);
  },

  updateBotPilot: async (
    bot: RaidBot,
    pilot: string,
    time: moment.Moment | null
  ) => {
    await raidBotsCache.updateBotPilot(bot.name, pilot, time?.toString() || "");
  },

  getCurrentBotPilot: async (botName: string) => {
    const bots = await raidBotsCache.getData();
    return [...bots.values()].find((b) => b.name === botName.toLowerCase())
      ?.currentPilot;
  },

  getRaidBotByName: async (name: string) => {
    const bots = await raidBotsCache.getData();
    return bots.get(name.toLowerCase());
  },

  getRaidBot: async (account: Account) => {
    return sharedCharacters.getRaidBotByName(account.characters);
  },

  getBotOptions: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const bots = await raidBotsCache.getData();
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
