import { Command } from "../../shared/command/command";
import { removeSubcommand } from "./remove-subcommand";

export const invitedCommand = new Command(
  "invite",
  "Add or remove a character from the invite list.",
  [removeSubcommand]
);
