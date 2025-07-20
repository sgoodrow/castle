import { ButtonInteraction, CacheType, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import { requestDumpThreadId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import { VOLUNTEER_APPLICATION, APPLICATION_MESSAGE_TEMPLATE } from "./constants";

export class RequestApplication extends ButtonCommand {
  public constructor() {
    super(VOLUNTEER_APPLICATION.CUSTOM_ID);
  }

  public get label() {
    return VOLUNTEER_APPLICATION.LABEL;
  }

  public async execute(interaction: ButtonInteraction<CacheType>) {
    interaction.user.send({
      content: this.content,
    });
    await interaction.editReply({
      content: `You have been DM'd the **${this.label}**.`,
    });

    const channel = await interaction.guild?.channels.fetch(requestDumpThreadId);
    if (!channel) {
      throw new Error("Could not locate the request dump channel");
    }
    if (channel.type !== ChannelType.PublicThread) {
      throw new Error(`${requestDumpThreadId} is not a text channel.`);
    }

    await channel.send(
      `${this.label} sent to **${interaction.user.username}** (<@${interaction.user.id}>)`
    );
  }

  public getButtonBuilder(style: ButtonStyle) {
    return new ButtonBuilder().setCustomId(this.customId).setStyle(style).setLabel(this.label);
  }

  private get content() {
    return APPLICATION_MESSAGE_TEMPLATE;
  }
}
