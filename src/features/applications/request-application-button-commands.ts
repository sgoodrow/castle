import {
  ButtonInteraction,
  CacheType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { requestDumpThreadId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";

export class RequestApplication extends ButtonCommand {
  public constructor(
    private readonly role: string,
    private readonly description: string,
    private readonly formUrl: string,
    private readonly outcome: string
  ) {
    super(`request${role}Application`);
  }

  public get label() {
    return `${this.role} Application`;
  }

  public async execute(interaction: ButtonInteraction<CacheType>) {
    interaction.user.send({
      content: this.content,
    });
    await interaction.editReply({
      content: `You have been DM'd the **${this.label}**.`,
    });

    const channel = await interaction.guild?.channels.fetch(
      requestDumpThreadId
    );
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
    return new ButtonBuilder()
      .setCustomId(this.customId)
      .setStyle(style)
      .setLabel(this.label);
  }

  private get content() {
    return `**DO NOT REPLY TO THIS MESSAGE.**

In Castle, leadership and volunteering are duties with no special privileges. ${this.role}s are tasked with ${this.description}. Volunteers may step down at any time.

**How do I apply to be a ${this.role}?**
Fill out the following Google form: https://docs.google.com/forms/d/e/1FAIpQLSelYSgoouJCOIV9qoOQ1FdOXj8oGC2pfv7P47iUUd1hjOic-g/viewform.

**What happens to an application?**
Applications are reviewed by current officers. This process typically takes less than a week.`;
  }
}
