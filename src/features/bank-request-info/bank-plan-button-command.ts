import { readFileSync } from "fs";
import path from "path";
import { ButtonInteraction, CacheType, RESTJSONErrorCodes } from "discord.js";
import { prismaClient } from "../..";
import { bankerRoleId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { PLAN_BUTTON, readPlanId } from "../../shared/bank-plan-id";
import { stockIn, type Stock } from "../../shared/bank-stock";
import { bankPlan, planMessages } from "./bank-plan";

// What the bot needs of the item database the bank page reads: each item's name, and whether it's
// NO DROP, which can't leave the bank. Read once, the first time a banker asks for a plan.
type ItemFacts = Map<number, { name: string; nodrop: boolean }>;
let facts: ItemFacts | undefined;
const itemFacts = (): ItemFacts => {
  if (facts) return facts;
  const db: Record<string, { name: string; nodrop?: boolean }> = JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../../../bank/data/itemdb.json"),
      "utf-8"
    )
  );
  facts = new Map(
    Object.entries(db).map(([id, it]) => [
      +id,
      { name: it.name, nodrop: !!it.nodrop },
    ])
  );
  return facts;
};

// The bank's filled slots of these items, read as the bank page reads them.
const liveStock = async (ids: number[]): Promise<Stock[]> => {
  const slots = await prismaClient.slot.findMany({
    where: { itemId: { in: ids } },
    select: {
      charName: true,
      slot: true,
      itemId: true,
      count: true,
      item: { select: { name: true } },
    },
  });
  return slots.flatMap((s) => {
    const stock = stockIn(s, (id) => !!itemFacts().get(id)?.nodrop);
    return stock ? [stock] : [];
  });
};

// The bank's spelling of an item's name, as the bank page shows it.
const itemNames = async (ids: number[]) => {
  const items = await prismaClient.item.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const names = new Map(items.map((it) => [it.id, it.name]));
  return (id: number) =>
    names.get(id) ?? itemFacts().get(id)?.name ?? `Item ${id}`;
};

// A bank post's "DM me the plan" button. A banker who presses it is sent the plan by DM, from the
// bank as it is now; anyone else is told no. The channel gets nothing new.
class BankPlanButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    requireInteractionMemberRole(bankerRoleId, interaction);
    const lines = readPlanId(interaction.customId);
    if (!lines) throw new Error("This request's plan can't be read.");
    const ids = [...new Set(lines.map((l) => l.id))];
    const [stock, name] = await Promise.all([liveStock(ids), itemNames(ids)]);
    const messages = planMessages(bankPlan(lines, stock, name));
    try {
      for (const m of messages) await interaction.user.send(m);
    } catch (err) {
      // Anything but closed DMs is the bot's failure, and is answered as one.
      if (
        (err as { code?: unknown }).code !==
        RESTJSONErrorCodes.CannotSendMessagesToThisUser
      )
        throw err;
      await interaction.editReply(
        "I couldn't DM you the plan. Allow DMs from this server's members, then press the button again."
      );
      return;
    }
    await interaction.editReply("Sent you the plan by DM.");
  }
}

export const bankPlanButtonCommand = new BankPlanButtonCommand(PLAN_BUTTON);
