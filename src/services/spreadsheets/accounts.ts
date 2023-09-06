import { GoogleSpreadsheetRow } from "google-spreadsheet";
import {
  bankerRoleId,
  guardRoleId,
  knightRoleId,
  officerRoleId,
  raiderRoleId,
  sharedCharactersGoogleSheetId,
} from "../../config";
import { SpreadsheetCache } from "../../shared/spreadsheet-cache";

enum Columns {
  Characters = "Characters",
  Purpose = "Purpose",
  Account = "Account",
  Password = "Password",
  AllowOfficers = "Officers",
  AllowKnights = "Knights",
  AllowGuards = "Guards",
  AllowBankers = "Bankers",
  AllowRaiders = "Raiders",
}

const CHECKED = "TRUE";

interface Role {
  name: string;
  id: string;
}

export interface Account {
  characters: string;
  accountName: string;
  password: string;
  requiredRoles: Role[];
  purpose?: string;
}

class AccountsCache extends SpreadsheetCache<`${Columns}`, Account> {
  public parseRow(row: GoogleSpreadsheetRow): Account {
    return {
      characters: row[Columns.Characters],
      purpose: row[Columns.Purpose],
      accountName: row[Columns.Account],
      password: row[Columns.Password],
      requiredRoles: this.getRequiredRoles(row),
    };
  }

  public getRowKey(d: Account): string | undefined {
    if (d.characters && d.accountName && d.password) {
      return d.characters.toLowerCase();
    }
  }

  private getRequiredRoles(row: GoogleSpreadsheetRow) {
    const roles: Role[] = [];
    if (row[Columns.AllowOfficers] === CHECKED) {
      roles.push({ name: "Officer", id: officerRoleId });
    }
    if (row[Columns.AllowKnights] === CHECKED) {
      roles.push({ name: "Knight", id: knightRoleId });
    }
    if (row[Columns.AllowGuards] === CHECKED) {
      roles.push({ name: "Guard", id: guardRoleId });
    }
    if (row[Columns.AllowBankers] === CHECKED) {
      roles.push({ name: "Banker", id: bankerRoleId });
    }
    if (row[Columns.AllowRaiders] === CHECKED) {
      roles.push({ name: "Raider", id: raiderRoleId });
    }
    return roles;
  }
}

export const accountsCache = new AccountsCache(
  "Castle Bots",
  sharedCharactersGoogleSheetId
);
