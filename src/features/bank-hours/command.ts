import { Command } from "../../shared/command/command";
import { addSubcommand } from "./add-command";
import { removeSubcommand } from "./remove-command";

export const bankHourCommand = new Command(
  "bankhour",
  "Set or remove bank hours.",
  [addSubcommand, removeSubcommand]
);
