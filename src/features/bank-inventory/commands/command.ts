import { Command } from "../../../shared/command/command";
import { bankRequest } from "./bank-request-subcommand";
import { syncBankDb } from "./bank-db-sync-subcommand";
import { bankSearch } from "./bank-search-subcommand";
import { getItem } from "./bank-get-item-data-subcommand";
import { setItem } from "./bank-set-item-data-subcommand";

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
  [
    bankRequest, 
    syncBankDb, 
    bankSearch,
    getItem,
    setItem
  ] 
);