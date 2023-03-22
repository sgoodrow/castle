import {
  Client,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from "discord.js";
import { raiderEnlistmentChannelId, reinforcementsRoleId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";
import { joinReinforcementsButtonCommand } from "./join-reinforcements-button-command";
import { leaveReinforcementsButtonCommand } from "./leave-reinforcements-button-command";

export const updateReinforcementInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateReinforcementsInfoAction(client), options);

class UpdateReinforcementsInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [await this.getDescriptionEmbed(), await this.getTldrEmbed()],
        components: [await this.getButtons()],
      },
      Name.ReinforcementsInstructions
    );
  }

  private async getDescriptionEmbed() {
    const role = `<@&${reinforcementsRoleId}>`;
    return new MessageEmbed({
      title: "Join the Reinforcements",
      description: `The ${role} role is **optional**. Are you available to assist with ad hoc targets of opportunity that typically require 1-2 groups such as Scout, VSR, Ragefire, etc? Join the reinforcements!

❓ **How do I participate and how do I stop?**
• Use the buttons below to join and leave the reinforcements at will.
• When called upon: if you don't like the loot rules, don't help. Play nice with each other and be fair.

❓ **How do I call for reinforcements?**
• Ping the role when you need help.
• You are responsible for determining fair loot rules and ensuring they are understood by all participants.
• Avoid asking for help during raids and scheduled socks.
• Avoid using for Lodi.
• Avoid using for filling out EXP groups.
• These events cannot involve earning or spending DKP.

❗ **Examples**
> "${role} I won Scout roll and need help. Quest loot is mine, rest /random"

> "${role} Phinny is up, all loot /random"

> "${role} VSR is up. Roll for turn in/stone, other loot /random"`,
    });
  }

  private async getButtons() {
    return new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(joinReinforcementsButtonCommand.customId)
        .setStyle("PRIMARY")
        .setLabel("Join Reinforcements"),
      new MessageButton()
        .setCustomId(leaveReinforcementsButtonCommand.customId)
        .setStyle("DANGER")
        .setLabel("Leave Reinforcements")
    );
  }

  private async getTldrEmbed() {
    return new MessageEmbed({
      title: "⚠️ TL;DR",
      description: `Opt-in and out of the role to help others. Get and send notifications for ad hoc fights. Set loot rules and be fair or you'll be removed from reinforcements.`,
      color: "ORANGE",
    });
  }

  protected get channel() {
    return this.getChannel(raiderEnlistmentChannelId, "raider enlistment");
  }
}
