// The plan button on a bank post. The banker who presses it is DMed the plan: which characters to log in
// to, in order, and what to take from each. The bot works it out from the bank as it is now.
import fs from "fs";
import path from "path";
import { ButtonInteraction, CacheType } from "discord.js";
import { bankerRoleId } from "../../config";
import {
  isBag,
  isSkyMule,
  titleCase,
  type HoldingRules,
} from "../../shared/bank-holders";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { PLAN_ID, readPlanId, type PlanLine } from "../../shared/bank-plan-id";
import { bankData } from "../bank-inventory/bank-data";
import { planText, splitPlan, type PlanItem } from "./bank-plan";

// The item database the bank page reads, for who may hold each item. Read on each press and not kept, so
// the parsed database isn't held in the bot's memory between plans.
const itemsDatabase = (): Record<string, HoldingRules & { name: string }> =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../../../bank/data/itemdb.json"),
      "utf-8"
    )
  );

// Each line with the bank's stock of its item, as the page lists it: NO DROP items are never fetched, and a
// bag is only fetched from a Sky mule (the page's Sky flag isn't in the item database, so a bag the Sky sheet
// lists but another mule holds isn't planned). The Empty slot is left out, and a slot with no count, or a
// count of zero, counts as one, as on the page.
async function planItems(lines: PlanLine[]): Promise<PlanItem[]> {
  const db = itemsDatabase();
  const slots = await bankData.holdingsOf(lines.map((l) => l.id));
  return lines.map((line) => {
    const raw = db[String(line.id)];
    if (!raw) throw new Error(`Unknown item ${line.id} on the plan.`);
    const holders = slots
      .filter(
        (s) =>
          s.itemId === line.id &&
          s.item?.name !== "Empty" &&
          !raw.nodrop &&
          (!isBag(raw) || isSkyMule(s.charName ?? ""))
      )
      .map((s) => ({
        char: titleCase(s.charName ?? ""),
        loc: s.slot,
        count: s.count || 1,
        mq: false,
      }));
    // The bank's own spelling of the name, as the page and the post show it, when the bank holds the item.
    const name = slots.find((s) => s.itemId === line.id)?.item?.name ?? raw.name;
    return { ...line, name, holders };
  });
}

class BankPlanButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    requireInteractionMemberRole(bankerRoleId, interaction);
    const lines = readPlanId(interaction.customId);
    if (!lines) throw new Error(`Not a bank plan: ${interaction.customId}`);

    const text = planText(await planItems(lines));
    try {
      for (const part of splitPlan(text)) await interaction.user.send(part);
    } catch (error) {
      console.error(`bank plan DM failed: ${error}`);
      throw new Error(
        "I couldn't DM you the plan. Check that DMs from this server are open, then press the button again."
      );
    }
    await interaction.editReply({ content: "I've DMed you the plan." });
  }
}

export const bankPlanButtonCommand = new BankPlanButtonCommand(PLAN_ID);
