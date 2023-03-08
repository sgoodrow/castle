import { Command } from "../../../shared/command/command";
import { setTickSubcommand } from "./set-tick-subcommand";

export const raidCommand = new Command("raid", "Set raid details.", [
  setTickSubcommand,
]);
