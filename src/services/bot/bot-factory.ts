import { env } from "process";
import { IPublicAccountService } from "./public-accounts.i";
import { PrismaPublicAccounts } from "./bot-prisma";
import { SheetPublicAccountService } from "./public-accounts-sheet";

export class PublicAccountsFactory {
  private static instance: IPublicAccountService;

  public static getService() {
    if (!this.instance) {
      if (env.USE_PRISMA_CACHE) {
        this.instance = new PrismaPublicAccounts();
      } else {
        this.instance = SheetPublicAccountService.getInstance();
      }
    }
    return this.instance;
  }
}
