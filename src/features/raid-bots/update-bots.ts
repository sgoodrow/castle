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
All bots should be used for the benefit of the guild, not personal use. Helping with corpse recoveries (yours and others) does count! Do not use them to farm. Tip generously when getting a port or res.

• **Leveling Raid Bot** Currently being leveled. Help level them to earn DKP!
• **COTH Bot (Station)** COTH bot ready to be piloted, stationed at various locations. Do not move without Knight approval.
• **DPS Bot** Damage-dealing bot ready to be piloted. Do not move without Knight approval.
• **CH Bot** Chain-healing bot ready to be piloted. Do not move without Knight approval.
• **Port Bot (Bind)** Teleporting bot ready to be piloted.
• **Rez Bot (Bind)** Resurrecting bot ready to be piloted.

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
