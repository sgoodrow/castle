import { Command } from "../../../shared/command/command";
import { bankRequest } from "./bank-request-subcommand";
import { syncBankDb } from "./bank-db-sync-subcommand";
<<<<<<< HEAD

// import { itemStock } from "./bank-stock";
// import { bankerInventory } from "./banker-request";
=======
import { bankSearch } from "./bank-search-subcommand";
import { getItem } from "./bank-get-item-data-subcommand";
import { setItem } from "./bank-set-item-data-subcommand";
>>>>>>> bankbot-dev

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
<<<<<<< HEAD
  [bankRequest, syncBankDb] // bankerInventory removed for now.
=======
  [
    bankRequest, 
    syncBankDb, 
    bankSearch,
    getItem,
    setItem
  ] 
>>>>>>> bankbot-dev
);