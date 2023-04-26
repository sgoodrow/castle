import { Command } from "../../shared/command/command";
import { requestSubcommand } from "./request-subcommand";

export const botCommand = new Command(
  "bot",
  "Retrieve information about bots.",
  [requestSubcommand]
);
