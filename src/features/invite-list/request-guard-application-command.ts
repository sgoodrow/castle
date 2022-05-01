import { ButtonInteraction, CacheType } from "discord.js";
import { ButtonCommand } from "../../shared/command/button-command";

class RequestGuardApplication extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    interaction.user.send({
      content: `In <Castle>, leadership is a voluntary service with no compensation or special privileges. Guards are tasked with conducting guild invites and optionally running non-raid events.

**How to apply to be a Guard of <Castle> Green**
Send a Discord message to any current Officer with your answers to the following questions.

**Guard Application**
> 1. Please describe what motivates you to volunteer as a Guard of <Castle>.
> 
> 2. Guards must set a shining example of the guild while interacting with prospective recruits. Are you willing to hold yourself to the highest standards of decorum while representing Castle to new members?
> 
> 3. While we should play the game and not be on-duty all the time, being a Guard will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being a Guard of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?

**What happens to an application?**
Guards are voted in by current officers. Each applicant must be approved by 3 current officers. This process typically takes a less than a week. Current officers are the only players who see applications. Applications and their discussion are deleted permanently once voted on.`,
    });
    await interaction.reply({
      content: "You have been DM'd the **Guard Application**.",
      ephemeral: true,
    });
  }
}

export const requestGuardApplicationCommand = new RequestGuardApplication(
  "requestGuardApplication"
);
