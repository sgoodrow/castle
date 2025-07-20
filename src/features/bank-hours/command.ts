import { Command } from "../../shared/command/command";
import { addSubcommand } from "./add-subcommand";
import { removeSubcommand } from "./remove-subcommand";

export const bankHourCommand = new Command("bankhour", "Set or remove bank hours.", [
  addSubcommand,
  removeSubcommand,
]);
