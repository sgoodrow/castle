import {
  ApplicationCommandOptionChoiceData,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Subcommand } from "../../shared/command/subcommand";
import { authorizeByMemberRoles } from "../../shared/command/util";
import {
  officerRoleId,
  knightRoleId,
  wakeupChannelId,
  modRoleId,
} from "../../config";
import { container } from "tsyringe";
import { WakeupService } from "./wakeup.service";

export class WakeupTestSubcommand extends Subcommand {
  constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );
    if (wakeupChannelId) {
      const wakeupService = container.resolve(WakeupService);
      await wakeupService.runWakeup(
        `Batphone. ${interaction.user} sent a test command`
      );
      await interaction.editReply("Test command executed");
    }
  }

  public get command() {
    return super.command;
  }

  public getOptionAutocomplete(): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    throw new Error("Method not implemented.");
  }
}

export const wakeupTestSubCommand = new WakeupTestSubcommand(
  "test",
  "Test the wakeup"
);
