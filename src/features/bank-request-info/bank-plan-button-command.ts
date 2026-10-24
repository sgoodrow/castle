// The plan button on a bank post. The banker who presses it is DMed the plan: which characters to log in
// to, in order, and what to take from each. The bot works it out from the bank as it is now.
import fs from "fs";
import path from "path";
import { ButtonInteraction, CacheType } from "discord.js";
import { bankerRoleId } from "../../config";
import { titleCase, type HoldingRules } from "../../shared/bank-holders";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { PLAN_ID, readPlanId, type PlanLine } from "../../shared/bank-plan-id";
import { bankData } from "../bank-inventory/bank-data";
import { planText, splitPlan, type PlanItem } from "./bank-plan";

type ItemRules = HoldingRules & { name: string };

// The item database the bank page reads, for who may hold each item, kept to the fields the plan reads. It's
// read on the first press and kept after that, so a press doesn't parse the whole database again.
let rules: Promise<Record<string, ItemRules>> | undefined;
const itemsDatabase = () => {
  if (!rules) rules = readItemsDatabase();
  return rules;
};
async function readItemsDatabase() {
  const db = JSON.parse(
    await fs.promises.readFile(
      path.resolve(__dirname, "../../../bank/data/itemdb.json"),
      "utf-8"
    )
  ) as Record<string, ItemRules>;
  return Object.fromEntries(
    Object.entries(db).map(([id, raw]) => [
      id,
      {
        name: raw.name,
        nodrop: raw.nodrop,
        cls: raw.cls,
        bagslots: raw.bagslots,
      },
    ])
  );
}

// Each line with the bank's stock of its item, as the page lists it: NO DROP items are never fetched. A bag
// on a post is a Plane of Sky bag, which the page lists from any holder, so it's fetched from any holder too.
// The Empty slot is left out, and a slot with no count, or a count of zero, counts as one, as on the page.
async function planItems(lines: PlanLine[]): Promise<PlanItem[]> {
  const db = await itemsDatabase();
  const slots = await bankData.holdingsOf(lines.map((l) => l.id));
  return lines.map((line) => {
    const raw = db[String(line.id)];
    if (!raw) throw new Error(`Unknown item ${line.id} on the plan.`);
    const holders = slots
      .filter(
        (s) => s.itemId === line.id && s.item?.name !== "Empty" && !raw.nodrop
      )
      .map((s) => ({
        char: titleCase(s.charName ?? ""),
        loc: s.slot,
        count: s.count || 1,
        mq: false,
      }));
    // The bank's own spelling of the name, as the page and the post show it, when the bank holds the item.
    const name =
      slots.find((s) => s.itemId === line.id)?.item?.name ?? raw.name;
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
