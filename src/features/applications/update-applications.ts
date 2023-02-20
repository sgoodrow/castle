import { Client, MessageActionRow, MessageEmbed } from "discord.js";
import { applicationsChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import {
  requestBankerApplicationButtonCommand,
  requestGuardApplicationButtonCommand,
  requestKnightApplicationButtonCommand,
  requestOfficerApplicationButtonCommand,
} from "./request-application-button-commands";

export const updateGuardInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateGuardInfoAction(client), options);

class UpdateGuardInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [await this.leadershipRoles()],
        components: [await this.getButtons()],
      },
      Name.GuardInstructions
    );
  }

  private async leadershipRoles() {
    return new MessageEmbed({
      title: "Volunteer Roles",
      url: "https://docs.google.com/document/d/19fqGGGAW3tXTPb8syiCZQZED9qTGhY65dnaWL8YzZnE",
      description: `**What do Castle volunteers do?**
• Castle is a casual-friendly guild and that applies to volunteer and leadership roles as well. We have many volunteer roles that help keep the guild running.
• Click the link "Volunteer Roles" above to read about each.

**What's expected of Castle volunteers?**
• Commit as much time as you would like, when you'd like. You may step down or take a break at any time.
• Represent us well, both internally and externally.

**Am I a good candidate to volunteer?**
• Yes! We encourage everyone to volunteer at some point in their Castle stay. Many hands make light work!
• Volunteering is a great way to work your way up to becoming an Officer and shaping guild policy.

**How do I apply?**
• Press one of the buttons below to receive a copy of the role's application in a DM.
• Retrieving the application is not a commitment to apply!`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      requestOfficerApplicationButtonCommand.messageButton,
      requestGuardApplicationButtonCommand.messageButton,
      requestKnightApplicationButtonCommand.messageButton,
      requestBankerApplicationButtonCommand.messageButton
    );
  }

  protected get channel() {
    return this.getChannel(applicationsChannelId, "applications");
  }
}
