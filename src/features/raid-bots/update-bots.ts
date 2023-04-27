import { EmbedBuilder } from "discord.js";
import {
  bankOfficeChannelId,
  bankerRoleId,
  guardOfficeChannelId,
  guardRoleId,
  raidBotsChannelId,
  raiderRoleId,
} from "../../config";
import { Name } from "../../db/instructions";
import { accounts } from "../../services/accounts";
import {
  Options,
  readyActionExecutor,
} from "../../shared/action/ready-action-2";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action-2";
import { sortBy } from "lodash";
import { code } from "../../shared/util";

export const raidBotInstructions = new InstructionsReadyAction(
  Name.RaidBotInstructions,
  raidBotsChannelId,
  "Request Log"
);

export const updateRaidBotsInfo = (options: Options) =>
  readyActionExecutor(async () => {
    const raiderAccounts = await accounts.getAccountsForRole(raiderRoleId);
    const sorted = sortBy(
      raiderAccounts,
      (b) => b.purpose,
      (b) => b.characters
    );
    await raidBotInstructions.createOrUpdateInstructions({
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
          title: "Bots available to all Raiders",
          description: `${code}
${sorted
  .map((b) => `${b.characters.padEnd(18)} ${b.purpose}`)
  .join("\n")}${code}`,
        }),
      ],
    });
  }, options);

const bankBotInstructions = new InstructionsReadyAction(
  Name.BankBotInstructions,
  bankOfficeChannelId
);

export const updateBankBotInfo = (options: Options) =>
  readyActionExecutor(async () => {
    const bankerAccounts = await accounts.getAccountsForRole(bankerRoleId);
    const sorted = sortBy(
      bankerAccounts,
      (b) => b.purpose,
      (b) => b.characters
    );
    await bankBotInstructions.createOrUpdateInstructions(
      {
        embeds: [
          new EmbedBuilder({
            title: "Bank Bot Credentials",
            description:
              "The guild bank is collectively stored across the following characters. Do not share with non-bankers.",
            fields: sorted.map((b) => ({
              name: `${b.purpose} - ${b.characters}`,
              value: `${b.accountName} / ${b.password}`,
            })),
          }),
        ],
      },
      true
    );
  }, options);

const guardBotInstructions = new InstructionsReadyAction(
  Name.GuardBotInstructions,
  guardOfficeChannelId
);

export const updateGuardBotInfo = (options: Options) =>
  readyActionExecutor(async () => {
    const guardAccounts = await accounts.getAccountsForRole(guardRoleId);
    const sorted = sortBy(
      guardAccounts,
      (b) => b.purpose,
      (b) => b.characters
    );
    await guardBotInstructions.createOrUpdateInstructions(
      {
        embeds: [
          new EmbedBuilder({
            title: "Guard Bot Credentials",
            description:
              "Invites are made easier by using the following characters. Do not share with non-guards.",
            fields: sorted.map((b) => ({
              name: `${b.purpose} - ${b.characters}`,
              value: `${b.accountName} / ${b.password}`,
            })),
          }),
        ],
      },
      true
    );
  }, options);
