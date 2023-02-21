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
        embeds: [await this.volunteerRoles()],
        components: [await this.getButtons()],
      },
      Name.GuardInstructions
    );
  }

  private async volunteerRoles() {
    return new MessageEmbed({
      title: "Volunteer Applications",
      description: `Castle is a casual-friendly guild and that applies to volunteer and leadership roles as well. We have many volunteer roles that help keep the guild running smoothly.

:question: **What do volunteers do?**
• Read about each [volunteer role](https://docs.google.com/document/d/19fqGGGAW3tXTPb8syiCZQZED9qTGhY65dnaWL8YzZnE).

:question: **What's expected of volunteers?**
• Represent us well, both internally and externally.
• Commit as much time as you like, when you'd like.
• You may step down or take a break at any time.

:question: **Am I a good candidate to volunteer? What if I'm an ally?**
• Yes! Everyone is encouraged to volunteer.
• All roles are open to alliance members except :red_square: **Officer** and :red_square: **Guard**.

:scroll: **How do I apply?**
• Press one of the buttons below to receive a copy of the role's application in a DM.
• Retrieving the application is not a commitment to apply!

:sparkles: _"Many hands make light work!"_ :sparkles:`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      ...castleOrAllyRoles.map((r) => r.getMessageButton("SECONDARY")),
      ...castleOnlyRoles.map((r) => r.getMessageButton("DANGER"))
    );
  }

  protected get channel() {
    return this.getChannel(applicationsChannelId, "applications");
  }
}

const castleOnlyRoles = [
  requestOfficerApplicationButtonCommand,
  requestGuardApplicationButtonCommand,
];

const castleOrAllyRoles = [
  requestKnightApplicationButtonCommand,
  requestBankerApplicationButtonCommand,
];
