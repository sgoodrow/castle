import { Command } from "src/shared/command/command";
import { itemSubcommand, spellSubcommand } from "./auction-subcommand";

// Why are these commands split up? Because the available JSON data was split
// along these dimensions and it's a useful conceptual boundary even if the
// results are the same.
export const auctionCommand = new Command("auction", "Start a new auction.", [
  spellSubcommand,
  itemSubcommand,
]);
