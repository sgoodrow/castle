import { Command } from "../../shared/command/command";
import { setSongSubCommand } from "./setsong-subcommand";
import { wakeupTestSubCommand } from "./wakeuptest-command";

export const wakeupCommand = new Command("wakeup", "Wakeup commands.",
  [setSongSubCommand, 
  wakeupTestSubCommand]);
