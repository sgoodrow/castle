import { Command } from "@shared/command/command";
import { addSubcommand } from "./add-subcommand";
import { removeSubcommand } from "./remove-subcommand";

export const invitedCommand = new Command(
  "invite",
  "Add or remove a character from the invite list.",
  [addSubcommand, removeSubcommand]
);
