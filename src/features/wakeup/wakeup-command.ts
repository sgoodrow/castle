import { Command } from "../../shared/command/command";
import { setSongSubCommand } from "./setsong-subcommand";

export const wakeupCommand = new Command(
  "wakeup",
  "Retrieve information about bots.",
  [setSongSubCommand]
);
