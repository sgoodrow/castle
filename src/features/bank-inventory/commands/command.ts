import { Command } from "../../../shared/command/command";
import { bankRequest } from "./bank-request-subcommand";
import { syncBankDb } from "./bank-db-sync-subcommand";

// import { itemStock } from "./bank-stock";
// import { bankerInventory } from "./banker-request";

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
  [bankRequest, syncBankDb] // bankerInventory removed for now.
);