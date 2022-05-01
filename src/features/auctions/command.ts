import { Command } from "../../shared/command/command";
import { itemSubcommand } from "./item-subcommand";
import { spellSubcommand } from "./spell-subcommand";

export const auctionCommand = new Command("auction", "Start a new auction.", [
  spellSubcommand,
  itemSubcommand,
]);
