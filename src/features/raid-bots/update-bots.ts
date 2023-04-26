import { EmbedBuilder } from "discord.js";
import { raidBotsChannelId, raiderRoleId } from "../../config";
import { Name } from "../../db/instructions";
import { accounts } from "../../services/accounts";
import {
  Options,
  readyActionExecutor,
} from "../../shared/action/ready-action-2";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action-2";
import { sortBy } from "lodash";
import { code } from "../../shared/util";

export const botInstructions = new InstructionsReadyAction(
  Name.BotInstructions,
  raidBotsChannelId,
  "Request Log"
);

export const updateBotsInfo = (options: Options) =>
  readyActionExecutor(async () => {
    const raiderAccounts = await accounts.getAccountsForRole(raiderRoleId);
    const sorted = sortBy(raiderAccounts, (b) => b.purpose);
    await botInstructions.createOrUpdateInstructions({
      embeds: [
        new EmbedBuilder({
          title: "Raid Bot Instructions",
          description: `Castle has several shared characters used for various activities.

❗**How do I access a bot?**
Use the \`/bot request\` command in ANY channel to receive their credentials in a DM. Messages are not allowed in this channel. Some characters are restricted to volunteer roles.

❗**What are the rules for playing bots?**
All bots should be used for the benefit of the guild, not personal use. Helping with corpse recoveries (yours and others) is ok unless the bot is not to be moved! Do not use them to farm. Do not sell their equipment or items. Tip generously when getting a port or res.

• **Guild Porting** Used to port members of the guild.
• **Guild Tracking** Used to track targets of opportunity, or hunt down mobs.
• **Guild CRs** Used to recover corpses.
• **Raid DPS** Damage-dealing bot ready to be piloted. Do not move without Knight approval.
• **Raid Tank** Tank bot ready to be piloted. Do not move without Knight approval.
• **Raid Cleric** Chain-healing bot ready to be piloted. Do not move without Knight approval.
• **Raid CotH** Magician with Call of the Hero. Do not move without Knight approval.
• **Raid Sky Ports** Wizard with Portal: Plane of Sky necklace.
• **Raid Pulling** Bot positioned for races and raid pulling. Do not move without Knight approval.

⚠️ **Note**
All credential requests are logged for our protection.`,
        }),
        new EmbedBuilder({
          title: "Raiding Bots",
          description: `${code}
${sorted
  .map((b) => `${b.characters.padEnd(18)} ${b.purpose}`)
  .join("\n")}${code}`,
        }),
      ],
    });
  }, options);
