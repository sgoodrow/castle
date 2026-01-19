import { Command } from "../../../shared/command/command";
import { bonusesThreadSubcommand } from "./bonuses-thread-subcommand";
import { setTickSubcommand } from "./set-tick-subcommand";

export const raidCommand = new Command("raid", "Work with raids.", [
  setTickSubcommand,
  bonusesThreadSubcommand
  //getPlayerDkpSubcommand,
]);
