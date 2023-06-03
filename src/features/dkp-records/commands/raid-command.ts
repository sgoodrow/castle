import { Command } from "../../../shared/command/command";
import { bonusesThreadSubcommand } from "./bonuses-thread-subcommand";
import { getPlayerDkpSubcommand } from "./player-dkp-subcommand";
import { setTickSubcommand } from "./set-tick-subcommand";

export const raidCommand = new Command("raid", "Work with raids.", [
  setTickSubcommand,
  bonusesThreadSubcommand,
  getPlayerDkpSubcommand,
]);
