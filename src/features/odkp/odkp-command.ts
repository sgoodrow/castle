import { Command } from "../../shared/command/command";
import { odkpAddCharacterSubcommand } from "./odkp-addcharacter-subcommand";

export const odkpCommand = new Command("odkp", "OpenDKP commands", [
  odkpAddCharacterSubcommand,
]);
