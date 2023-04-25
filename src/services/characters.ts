import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  GOOGLE_CLIENT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  bankerRoleId,
  guardRoleId,
  knightRoleId,
  officerRoleId,
  raiderRoleId,
  sharedCharactersGoogleSheetId,
} from "../config";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import {
  ApplicationCommandOptionChoiceData,
  GuildMemberRoleManager,
} from "discord.js";
import { some, truncate } from "lodash";

enum SPREADSHEET_COLUMNS {
  CharacterName = "Bot / Toon Name",
  Class = "Class",
  Level = "Level",
  Account = "Account",
  Password = "Password",
  AllowOfficers = "Officers",
  AllowKnights = "Knights",
  AllowGuards = "Guards",
  AllowBankers = "Bankers",
  AllowRaiders = "Raiders",
}

const sheet = new GoogleSpreadsheet(sharedCharactersGoogleSheetId);

const getRequiredRoleIds = (row: GoogleSpreadsheetRow) => {
  const roles: string[] = [];
  if (row[SPREADSHEET_COLUMNS.AllowOfficers]) {
    roles.push(officerRoleId);
  }
  if (row[SPREADSHEET_COLUMNS.AllowKnights]) {
    roles.push(knightRoleId);
  }
  if (row[SPREADSHEET_COLUMNS.AllowGuards]) {
    roles.push(guardRoleId);
  }
  if (row[SPREADSHEET_COLUMNS.AllowBankers]) {
    roles.push(bankerRoleId);
  }
  if (row[SPREADSHEET_COLUMNS.AllowRaiders]) {
    roles.push(raiderRoleId);
  }
  return roles;
};

interface Character {
  character: string;
  account: string;
  password: string;
  requiredRoleIds: string[];
  class?: string;
  level?: string;
}

const cache = new LRUCache<string, Character>({
  max: 200,
  ttl: 5 * MINUTES,
});

const getCharacters = async () => {
  cache.purgeStale();
  if (cache.size) {
    return cache;
  }
  await sheet.useServiceAccountAuth({
    client_email: GOOGLE_CLIENT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY,
  });
  await sheet.loadInfo();
  const rows = await sheet.sheetsByIndex[0].getRows();
  rows.forEach((r) => {
    const c: Character = {
      character: r[SPREADSHEET_COLUMNS.CharacterName],
      class: r[SPREADSHEET_COLUMNS.Class],
      level: r[SPREADSHEET_COLUMNS.Level],
      account: r[SPREADSHEET_COLUMNS.Account],
      password: r[SPREADSHEET_COLUMNS.Password],
      requiredRoleIds: getRequiredRoleIds(r),
    };
    if (c.character && c.account && c.password) {
      cache.set(c.character, c);
    }
  });
  return cache;
};

export const characters = {
  getRaiderCharacters: async (): Promise<Character[]> => {
    const characters = await getCharacters();
    return [...characters.values()].filter((c) =>
      c.requiredRoleIds.includes(raiderRoleId)
    );
  },

  getCharacterList: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const characters = await getCharacters();
    return [...characters.values()].map((c) => ({
      name: truncate(
        `${c.character} - ${c.class} ${c.level} (${c.requiredRoleIds.join(
          ", "
        )})`,
        {
          length: 100,
        }
      ),
      value: c.character,
    }));
  },

  getCharacterDetails: async (
    name: string,
    roles: GuildMemberRoleManager
  ): Promise<Character> => {
    const characters = await getCharacters();
    const d = characters.get(name);
    if (!d) {
      throw new Error(`${name} is not a shared character`);
    }
    const hasRole = some(d.requiredRoleIds.map((id) => roles.cache.has(id)));
    if (!hasRole) {
      throw new Error(`You do not have the required role to access ${name}`);
    }
    return d;
  },
};
