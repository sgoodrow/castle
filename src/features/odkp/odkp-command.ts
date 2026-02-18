import { Command } from "../../shared/command/command";
import { odkpAddCharacterSubcommand } from "./odkp-addcharacter-subcommand";
import { odkpItemHistorySubcommand } from "./odkp-itemhistory-subcommand";

export const odkpCommand = new Command(
  "odkp",
  "OpenDKP commands",
  [odkpAddCharacterSubcommand, odkpItemHistorySubcommand],
  false
);
