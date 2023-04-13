import {
  ButtonInteraction,
  CacheType,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
} from "discord.js";
import { requestDumpThreadId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";

export class RequestApplication extends ButtonCommand {
  public constructor(
    private readonly role: string,
    private readonly questions: string[]
  ) {
    super(`request${role}Application`, false);
  }

  public get label() {
    return `${this.role} Application`;
  }

  public async execute(interaction: ButtonInteraction<CacheType>) {
    const modal = new ModalBuilder({
      title: `${this.role} Application`,
      customId: this.role,
      components: this.questions.length
        ? this.questions.map(
            (q, i) =>
              new ActionRowBuilder<ModalActionRowComponentBuilder>({
                components: [
                  new TextInputBuilder({
                    required: true,
                    customId: `question-${i}`,
                    label: `Question ${i + 1}`,
                    value: q,
                    style: TextInputStyle.Paragraph,
                  }),
                ],
              })
          )
        : [
            new ActionRowBuilder<ModalActionRowComponentBuilder>({
              components: [
                new TextInputBuilder({
                  required: false,
                  customId: "no-questions",
                  label: "Do you want to volunteer?",
                  value: "Yes",
                  style: TextInputStyle.Short,
                }),
              ],
            }),
          ],
    });

    await interaction.showModal(modal);

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
      `${this.label} opened by **${interaction.user.username}** (<@${interaction.user.id}>)`
    );
  }

  public getButtonBuilder(style: ButtonStyle) {
    return new ButtonBuilder()
      .setCustomId(this.customId)
      .setStyle(style)
      .setLabel(this.label);
  }
}
