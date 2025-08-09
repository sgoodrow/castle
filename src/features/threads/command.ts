import { Command } from "../../shared/command/command";
import { addSubcommand } from "./add-subcommand";
import { listSubcommand } from "./list-subcommand";

export const threadUtilCommand = new Command("threadutil", "Utilities for working with threads.", [
  addSubcommand,
  listSubcommand,
]);
