import { Command } from "../../shared/command/command";
import { bankRequest } from "./bank-request";

export const bankCommand = new Command(
  "bank",
  "Use the guild bank.",
  [bankRequest]
);