import { Command } from "../../shared/command/command";
import { getSubCommand } from "./get-subcommand";
import { inSubCommand } from "./in-subcommand";
import { openSubCommand } from "./open-subcommand";
import { outSubCommand } from "./out-subcommand";

export const dsCommand = new Command(
  "ds",
  "Manage Drusella Sathir UKP.",
  [inSubCommand, outSubCommand, getSubCommand, openSubCommand],
  false
);
