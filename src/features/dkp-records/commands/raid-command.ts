import { Command } from "../../../shared/command/command";
import { bonusesThreadSubcommand } from "./bonuses-thread-subcommand";
import { getValuesSubcommand } from "./get-values-subcommand";
import { setTickSubcommand } from "./set-tick-subcommand";

export const raidCommand = new Command("raid", "Work with raids.", [
  setTickSubcommand,
  bonusesThreadSubcommand,
  getValuesSubcommand
  //getPlayerDkpSubcommand,
]);
