import { Client, Colors, EmbedBuilder } from "discord.js";
import { raiderEnlistmentChannelId, raiderRoleId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action";
import {
  readyActionExecutor,
  ReadyActionExecutorOptions,
} from "../../shared/action/ready-action";

export const updateRaiderInfo = (
  client: Client,
  options?: ReadyActionExecutorOptions
) => readyActionExecutor(new UpdateRaiderInfoAction(client), options);

class UpdateRaiderInfoAction extends InstructionsReadyAction {
  public async execute(): Promise<void> {
    await this.createOrUpdateInstructions(
      {
        embeds: [await this.getRequirements(), await this.getTldrEmbed()],
      },
      Name.RaiderInstructions
    );
  }

  private async getRequirements() {
    return new EmbedBuilder({
      title: `Join the Raid Force`,
      description: `📜 **Raider Requirements**
- Read and understand the Castle DKP rules (https://tinyurl.com/rules-castle-dkp)
- Understand raid level requirements (https://discord.com/channels/539189546630381579/995406820950675558/1251567586773045318)
- Not raiding with any other guilds
- Not PvP flagged

📜 **Raider Behaviors**
1. **Be in raid voice.** Listen to raid leader instructions and do not argue with them. Only discuss the raid topics.
2. **Wait for assist.** Use an "/assist Name" macro. Attack only when assist is called to allow tanks to position mobs and enchanters to drain mana to prevent gating/healing.
3. **Arrive 15 minutes early.** Being late delays the raid.
4. **Send tells for buffs, res's and ports.** Do not use /say, /gu, or voice. Sending a /tell allows people to use /rt to target and buff you.
5. **Healers form groups unless RL says otherwise.** Druids, clerics, and shamans pick up LFGs. Send them a tell saying "invited". Everyone else set /lfg on and accept invites.
6. **Keep raid voice clear.** Voice is used by the pull team and raid leaders. Use text for everything you can.
7. **Avoid being AFK.** Don't attend raids you can't be present for. For short AFKs (less than 5 minutes), type /afk and announce it in /say. If you have a critical role (main tank, assist, cleric), say it in voice chat. Make someone else your group leader.
8. **Don't push mobs out of camp.** Melee should attack from the sides, not the back, so the tank stays near healers.
9. **Stand when a mob is incoming.** Sitting generates aggro. Mobs will one-shot sitters and mess up positioning.
10. **Only discuss raid targets in raid voice.** Targets get sniped. Keep our strategy and tactics close to the chest.

❓ **How do I join ${this.role}s?**
Each player must send a message in this channel with the following information and a Knight will give you the role.

1. Include a screenshot of your Castle- or alliance- tagged character with their name, guild and level visible. Also include /time in the chat.
2. Include a link to your CastleDKP.com raiding character profile (NOT the MyCharacters page). Please use first name only for your character.
3. Say **"I have read and agree to follow the raider requirements and behaviors."**

❓ **Are raids subject to any other rules?**
Yes. Some raids are deemed "Competitive", such as batphones, natural respawns of bosses and earthquakes. These may have different level requirements (posted above). Please bring your best characters and be willing to swap to another character if the raid depends on it.

❓ **What if I don't follow the required raider requirements or behaviors?**
Leadership will DM you to let you know that your actions were inappropriate. You will have an opportunity to speak for yourself. Depending on the behavior, the consequences could be: a reminder warning, a 1 DKP penalty, a 1 week suspension from raiding, or removal of your raider status.

#❓ **What else do I need to know?**
- DKP never decays in Castle, but if become inactive for 3 months you will need to request reactivation by posting in this channel.
- We give DKP for acquiring raid-readiness items. See https://discord.com/channels/539189546630381579/1090414660408320000/1090517649802407977 for details.`,
    });
  }

  private async getTldrEmbed() {
    return new EmbedBuilder({
      title: "⚠️ **TL;DR**",
      description: `Join the raid force and follow the expected raider behaviors -- if you don't you may get a warning, lose DKP or worse`,
      color: Colors.Orange,
    });
  }

  protected get role() {
    return `<@&${raiderRoleId}>`;
  }

  protected get channel() {
    return this.getChannel(raiderEnlistmentChannelId, "raider enlistment");
  }
}
