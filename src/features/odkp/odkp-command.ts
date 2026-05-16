import { Command } from "../../shared/command/command";
import { odkpAddCharacterSubcommand } from "./odkp-addcharacter-subcommand";
import { odkpSummarySubcommand } from "./odkp-character-summary";
import { odkpGetSubcommand } from "./odkp-get-subcommand";
import { odkpItemHistorySubcommand } from "./odkp-itemhistory-subcommand";
import { odkpTopSubcommand } from "./odkp-top-subcommand";

export const odkpCommand = new Command(
  "odkp",
  "OpenDKP commands",
  [
    odkpAddCharacterSubcommand,
    odkpItemHistorySubcommand,
    odkpGetSubcommand,
    odkpSummarySubcommand,
    odkpTopSubcommand,
  ]
);
