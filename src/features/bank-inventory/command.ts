import { Command } from "../../shared/command/command";
import { bankRequest } from "./bank-request";
import { itemStock } from "./bank-stock";
import { bankerInventory } from "./banker-request";

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
  [bankRequest, itemStock],  // bankerInventory removed for now.
);