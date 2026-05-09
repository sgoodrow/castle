import { Command } from "../../shared/command/command";
import { trackSubcommand } from "./commands/track-subcommand";
import { rteSubcommand } from "./commands/rte-subcommand";
import { raceSubcommand } from "./commands/race-subcommand";
import { openSubcommand } from "./commands/open-subcommand";
import { closeSubcommand } from "./commands/close-subcommand";
import { stopSubcommand } from "./commands/stop-subcommand";

export const rteCommand = new Command(
  "rte",
  "Manage RTE (ready to engage) sessions.",
  [
    trackSubcommand,
    rteSubcommand,
    raceSubcommand,
    openSubcommand,
    closeSubcommand,
    stopSubcommand,
  ]
);
