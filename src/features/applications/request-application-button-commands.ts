import {
  ButtonInteraction,
  CacheType,
  MessageButton,
  MessageButtonStyle,
} from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";

export class RequestApplication extends ButtonCommand {
  public constructor(
    private readonly role: string,
    private readonly description: string,
    private readonly howToApply: string,
    private readonly questions: string[],
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
    await interaction.reply({
      content: `You have been DM'd the **${this.label}**.`,
      ephemeral: true,
    });
  }

  public getMessageButton(style: MessageButtonStyle) {
    return new MessageButton()
      .setCustomId(this.customId)
      .setStyle(style)
      .setLabel(this.label);
  }

  private get content() {
    return `In Castle, leadership and volunteering are duties with no compensation or special privileges. ${
      this.role
    }s are tasked with ${this.description}. ${
      this.role
    }s may step down at any time.
  
**How do I apply to be a ${this.role}?**
Send a Discord message to ${this.howToApply} ${
      this.questions.length > 0
        ? "with your answers to the following questions"
        : "indicating your interest"
    }.
      
**${this.role} Application**
${
  this.questions.length > 0
    ? this.formattedQuestions
    : "There is none! Just send a message."
}
      
**What happens to an application?**
${this.role} applications are reviewed by ${
      this.outcome
    }. This process typically takes less than a week.`;
  }

  private get formattedQuestions() {
    return this.questions.map((q, i) => `> ${i + 1}. ${q}`).join("\n> \n");
  }
}
