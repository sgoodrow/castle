// The plan button on a bank post. The banker who presses it is DMed the plan: which characters to log in
// to, in order, and what to take from each. The bot works it out from the bank as it is now.
import fs from "fs";
import path from "path";
import { ButtonInteraction, CacheType } from "discord.js";
import { bankerRoleId } from "../../config";
import {
  fetchable,
  titleCase,
  type HoldingRules,
} from "../../shared/bank-holders";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { PLAN_ID, readPlanId, type PlanLine } from "../../shared/bank-plan-id";
import { bankData } from "../bank-inventory/bank-data";
import { planText, type PlanItem } from "./bank-plan";

// The item database the bank page reads, for who may hold each item.
let itemdb: Record<string, HoldingRules & { name: string }> | null = null;
const itemsDatabase = () =>
  (itemdb ??= JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "../../../bank/data/itemdb.json"),
      "utf-8"
    )
  ));

// Each line with the bank's stock of its item. NO DROP items and bags, and the Empty slot, are never
// fetched, as the page leaves them out.
async function planItems(lines: PlanLine[]): Promise<PlanItem[]> {
  const db = itemsDatabase();
  const slots = await bankData.holdingsOf(lines.map((l) => l.id));
  return lines.map((line) => {
    const raw = db[String(line.id)];
    if (!raw) throw new Error(`Unknown item ${line.id} on the plan.`);
    const holders = fetchable(raw)
      ? slots
          .filter((s) => s.itemId === line.id && s.item?.name !== "Empty")
          .map((s) => ({
            char: titleCase(s.charName ?? ""),
            loc: s.slot,
            count: s.count ?? 1,
            mq: false,
          }))
      : [];
    return { ...line, name: raw.name, holders };
  });
}

class BankPlanButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    requireInteractionMemberRole(bankerRoleId, interaction);
    const lines = readPlanId(interaction.customId);
    if (!lines) throw new Error(`Not a bank plan: ${interaction.customId}`);

    const text = planText(await planItems(lines));
    try {
      await interaction.user.send(text);
    } catch {
      throw new Error(
        "I couldn't DM you the plan. Check that DMs from this server are open, then press the button again."
      );
    }
    await interaction.editReply({ content: "I've DMed you the plan." });
  }
}

export const bankPlanButtonCommand = new BankPlanButtonCommand(PLAN_ID);
