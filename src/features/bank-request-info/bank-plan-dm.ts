// The DMs a banker is sent for a bank request's plan. The bank is read as it is when the banker asks,
// and so is the shared accounts sheet: a character is planned from only if its account lets bankers in.
import { readFileSync } from "fs";
import path from "path";
import { prismaClient } from "../..";
import { bankerRoleId } from "../../config";
import { accounts } from "../../services/accounts";
import type { PlanLine } from "../../shared/bank-plan-id";
import { stockIn, type Stock } from "../../shared/bank-stock";
import { bankPlan, planMessages, type Logins } from "./bank-plan";

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
  // The site only writes ids the item database knows, so a miss means the database lost one
  // since the post went up.
  return (id: number) => {
    const name = names.get(id) ?? itemFacts().get(id)?.name;
    if (name) return name;
    console.error(`bank plan: no item ${id}`);
    return `Item ${id}`;
  };
};

// The logins a banker may use, from the shared accounts sheet as it is now: the accounts that allow
// bankers. The sheet is read again each time, so a change to it is in the next plan.
const bankerLogins = async (): Promise<Logins> => {
  await accounts.refreshAccountData();
  const allowed = await accounts.getAccountsForRole(bankerRoleId);
  return new Map(
    allowed.map((a) => [
      a.characters.toLowerCase(),
      { account: a.accountName, password: a.password },
    ])
  );
};

// The plan for these lines as DMs, from the bank and the accounts sheet as they are now.
export async function planDms(lines: PlanLine[]): Promise<string[]> {
  const ids = [...new Set(lines.map((l) => l.id))];
  const [logins, stock, name] = await Promise.all([
    bankerLogins(),
    liveStock(ids),
    itemNames(ids),
  ]);
  return planMessages(bankPlan(lines, stock, name, logins));
}
