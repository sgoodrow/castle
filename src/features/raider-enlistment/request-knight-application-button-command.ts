import { ButtonInteraction, CacheType } from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";

class RequestKnightApplication extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    interaction.user.send({
      content: `In <Castle>, leadership is a voluntary service with no compensation or special privileges. Knights are tasked with running, scheduling and supporting guild raids. Knights may step down at any time.

**How do I apply to be a Knight of <Castle> Green?**
Send a Discord message to any officer or knight with your answers to the following questions.

**Knight Application**
> 1. Please describe what motivates you to volunteer as a Knight of <Castle>. Which aspects of being raid leadership, support and preparation are you interested in or willing to help with?
> 
> 2. Knights must set a shining example of the guild while interacting with raiders. Are you willing to hold yourself to the highest standards of decorum while representing Castle to new members?
> 
> 3. While we should play the game and not be on-duty all the time, being a Knight will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being a Knight of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?

**What happens to an application?**
Knight applications are reviewed and then a casual voice chat will be set up with a panel of knights and officers to discuss areas of interest. This process typically takes a less than a week. Applications are deleted permanently once reviewed.`,
    });
    await interaction.reply({
      content: "You have been DM'd the **Knight Application**.",
      ephemeral: true,
    });
  }
}

export const requestKnightApplicationButtonCommand = new RequestKnightApplication(
  "requestKnightApplication"
);
