import { Command } from "../../../shared/command/command";
import { bankRequest } from "./bank-request-subcommand";
import { syncBankDb } from "./bank-db-sync-subcommand";
import { bankSearch } from "./bank-search-subcommand";

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
  [
    bankRequest, 
    syncBankDb, 
    bankSearch
  ] 
);