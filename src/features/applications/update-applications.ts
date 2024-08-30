import {
  Client,
  ActionRowBuilder,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  ButtonStyle,
} from "discord.js";
import { applicationsChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { RequestApplication } from "./request-application-button-commands";

const applicationButton = new RequestApplication();

export const updateApplicationInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateApplicationInfoAction(client), options);

class UpdateApplicationInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [this.volunteerRoles()],
        // There is a limit of 5 buttons per action row. (hence: chunk)
        // There is a limit of 5 action rows. (note: no protection for this yet)
        components: [
          new ActionRowBuilder<MessageActionRowComponentBuilder>({
            type: 1,
            components: [
              applicationButton.getButtonBuilder(ButtonStyle.Secondary),
            ],
          }),
        ],
      },
      Name.ApplicationInstructions
    );
  }

  private volunteerRoles() {
    return new EmbedBuilder({
      title: "Volunteer Applications",
      description: `Castle is a casual-friendly guild and that applies to volunteer and leadership roles as well. We have many volunteer roles that help keep the guild running smoothly.

❓ **What do volunteers do?**
• Read about each [volunteer role](https://docs.google.com/document/d/19fqGGGAW3tXTPb8syiCZQZED9qTGhY65dnaWL8YzZnE).

❓ **What's expected of volunteers?**
• Represent us well, both internally and externally.
• Commit as much time as you like, when you'd like.
• You may take a break or step down at any time, but you will be required to re-apply if you become interested again.

❓ **Am I a good candidate to volunteer? What if I'm an ally?**
• Yes! Everyone is encouraged to volunteer.
• All roles are open to alliance members except :red_square: **Officer** and :red_square: **Guard**, which are Castle-members only.

📜 **How do I apply?**
• Press the button below to receive a link to the volunteer application in a DM.
• Retrieving the application is not a commitment to apply!

✨ _"Many hands make light work!"_ ✨`,
    });
  }

  protected get channel() {
    return this.getChannel(applicationsChannelId, "applications");
  }
}
