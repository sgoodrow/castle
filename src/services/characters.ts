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

const getRequiredRoles = (row: GoogleSpreadsheetRow) => {
  const roles: Role[] = [];
  if (row[SPREADSHEET_COLUMNS.AllowOfficers]) {
    roles.push({ name: "Officer", id: officerRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowKnights]) {
    roles.push({ name: "Knight", id: knightRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowGuards]) {
    roles.push({ name: "Guard", id: guardRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowBankers]) {
    roles.push({ name: "Banker", id: bankerRoleId });
  }
  if (row[SPREADSHEET_COLUMNS.AllowRaiders]) {
    roles.push({ name: "Raider", id: raiderRoleId });
  }
  return roles;
};

interface Role {
  name: string;
  id: string;
}

interface Character {
  character: string;
  account: string;
  password: string;
  requiredRoles: Role[];
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
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
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
      requiredRoles: getRequiredRoles(r),
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
      c.requiredRoles.map((r) => r.id).includes(raiderRoleId)
    );
  },

  getCharacterList: async (): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > => {
    const characters = await getCharacters();
    return [...characters.values()].map((c) => ({
      name: truncate(
        `${c.character} - ${c.class} ${c.level} (${c.requiredRoles
          .map((r) => r.name)
          .join(", ")})`,
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
    const hasRole = some(
      d.requiredRoles.map((r) => r.id).map((id) => roles.cache.has(id))
    );
    if (!hasRole) {
      throw new Error(`You do not have the required role to access ${name}`);
    }
    return d;
  },
};
