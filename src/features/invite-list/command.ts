import { Command } from "../../shared/command/command";
import { altSubcommand, playerSubcommand } from "./add-subcommand";
import { interviewedSubcommand } from "./interviewed-subcommand";
import { doneSubcommand } from "./done-subcommand";
import { removeSubcommand } from "./remove-subcommand";

export const inviteCommand = new Command(
  "invite",
  "Add or remove a character from the invite list.",
  [
    interviewedSubcommand,
    doneSubcommand,
    playerSubcommand,
    altSubcommand,
    removeSubcommand,
  ]
);
