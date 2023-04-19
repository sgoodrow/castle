import { Command } from "../../shared/command/command";
import { bankRequest } from "./bank-request";
import { bankerInventory } from "./banker-request";

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
  [bankRequest, bankerInventory],
);