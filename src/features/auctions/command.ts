import { Command } from "../../shared/command/command";
import { itemAuctionSubcommand } from "./item-auction-subcommand";
import { spellAuctionSubcommand } from "./spell-auction-subcommand";

export const auctionCommand = new Command("auction", "Start a new auction.", [
  spellAuctionSubcommand,
  itemAuctionSubcommand,
]);
