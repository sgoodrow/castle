import {
  ButtonInteraction,
  CacheType,
  MessageButton,
  MessageButtonStyle,
} from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";

class RequestApplication extends ButtonCommand {
  public constructor(
    public readonly customId: string,
    public readonly label: string,
    private readonly content: string
  ) {
    super(customId);
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
}

export const requestOfficerApplicationButtonCommand = new RequestApplication(
  "requestOfficerApplication",
  "Officer Application",
  `In Castle, leadership is a voluntary service with no compensation or special privileges. Officers are tasked with running the guild. Officers may step down at any time.

**How do I apply to be an Officer?**
Send a Discord message to any Officer with your answers to the following questions.

**Officer Application**
>  1. Please describe what motivates you to volunteer as an officer.
>  
>  2. Officers must set a shining example for the other members of the guild. This may include moderating our typical habits of speech in guild chat, and refraining from trash-talking even when others are rude. Furthermore, we must know the server rules inside and out, and follow them. Our behavior reflects directly upon Castle itself. Are you willing to hold yourself to the highest standards of decorum even during emotional times and to take responsibility for the consequences of your decisions as an officer?
>  
>  3. While we are allowed to play the game and not be on-duty all the time, being an Officer will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being an Officer of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?
>  
>  4. The complaints and reports we receive are sometimes genuine, but sometimes frivolous or false. We need people who will endure the discomfort of dealing diplomatically with reports and be willing to have honest talks with members, mostly 30-to-60-year-old adults, about their misbehavior in a video game. Do you have the maturity to maintain your composure and behave professionally?

**What happens to an application?**
Officers are voted in by current officers. Each applicant must be approved by 3 current officers and not be opposed by any. This process typically takes a less than a week. Officers are the only players who see applications. Applications and their discussion are deleted permanently once voted on.`
);

export const requestGuardApplicationButtonCommand = new RequestApplication(
  "requestGuardApplication",
  "Guard Application",
  `In Castle, leadership is a voluntary service with no compensation or special privileges. Guards are tasked with conducting guild invites, keeping the peace, and optionally running non-raid events. Guards may step down at any time.

**How do I apply to be a Guard?**
Send a Discord message to any officer with your answers to the following questions.

**Guard Application**
> 1. Please describe what motivates you to volunteer as a Guard.
> 
> 2. Guards must set a shining example of the guild while interacting with prospective recruits. Are you willing to hold yourself to the highest standards of decorum while representing Castle to new members?
> 
> 3. While we should play the game and not be on-duty all the time, being a Guard will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being a Guard of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?

**What happens to an application?**
Guards are approved by current officers. Each applicant must be approved by 3 officers and not be opposed by any. This process typically takes a less than a week. Officers are the only players who see applications.`
);

export const requestKnightApplicationButtonCommand = new RequestApplication(
  "requestKnightApplication",
  "Knight Application",
  `In Castle, leadership is a voluntary service with no compensation or special privileges. Knights are tasked with running, scheduling and supporting guild raids. Knights may step down at any time.

**How do I apply to be a Knight?**
Send a Discord message to any officer with your answers to the following questions.

**Knight Application**
> 1. Please describe what motivates you to volunteer as a Knight. Which aspects of being raid leadership, support and preparation are you interested in or willing to help with?
> 
> 2. Knights must set a shining example of the guild while interacting with raiders. Are you willing to hold yourself to the highest standards of decorum while representing Castle to new members?
> 
> 3. While we should play the game and not be on-duty all the time, being a Knight will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being a Knight of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?

**What happens to an application?**
Knight applications are reviewed and then a casual voice chat will be set up with a panel of knights and officers to discuss areas of interest. This process typically takes a less than a week.`
);

export const requestBankerApplicationButtonCommand = new RequestApplication(
  "requestBankApplication",
  "Bank Deputy Application",
  `In Castle, leadership is a voluntary service with no compensation or special privileges. Bank deputies are tasked with TODO. Bank deputies may step down at any time.

**How do I apply to be a Bank deputy?**
Send a Discord message to TODO with your answers to the following questions.

**Bank Deputy Application**
> 1. Banking requires you to perform recordkeeping in various places including google docs and discord threads. what challenges would you have with making time/space in your schedule to help guildies and also keep records?
> 
> 2. Banking requires patience and attention to detail. How capable are you of being patient and performing all aspects of your banking tasks?
> 
> 3. Please describe how you think it might be best to handle it when a requestor is not in zone when you log in to fullfill their bank request.

**What happens to an application?**
Bank deputy applications are TODO. This process typically takes a less than a week.`
);
