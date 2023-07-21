import { Command } from "../../shared/command/command";
import { requestSubcommand } from "./request-subcommand";
import { parkSubCommand } from "./park-subcommand";
import { requestClassSubcommand } from "./requestclass-subcommand"

export const botCommand = new Command(
  "bot",
  "Retrieve information about bots.",
  [requestSubcommand, requestClassSubcommand, parkSubCommand]
);
