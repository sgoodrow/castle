// The steps the bot's features are written in. Each is what the guild's members, its officers or
// the sheets they keep do or see. The bot's own code runs for real, on a real database; only Discord
// and Google Sheets are stand-ins (world.ts).
import { prismaClient } from "..";
import type { DefineStep } from "../testing/gherkin";
import type { PrismaPublicAccounts } from "../services/bot/bot-prisma";
import { world, type Row } from "./world";

const MINUTE = 60 * 1000;
const PUBLIC_SHEET = "public-sheet";
const BOT_TAB = "Bot Info";

let bots: PrismaPublicAccounts;

// Rows as Google Sheets gives them: a table's "row" column is the sheet's row number, and its other
// columns are the tab's, in order. Like the real API, a row's blank cells after its last filled one
// come back missing, not "".
const rowsOf = (table: Record<string, string>[]): Row[] =>
  table.map(({ row, ...cells }) => {
    const filled = Object.entries(cells);
    while (filled.length && !filled.at(-1)![1]) filled.pop();
    return { ...Object.fromEntries(filled), rowIndex: Number(row) } as Row;
  });

// Until the bot has finished loading the bots, and told raid chat whatever it tells it.
const loaded = async () => {
  await bots.guardReady().catch(() => undefined);
  await new Promise((r) => setImmediate(r));
};

const raidChat = () =>
  world.posts.filter((p) => p.channel === "raid-chat").map((p) => p.content);

export const steps = ({ defineStep: step }: { defineStep: DefineStep }) => {
  // ---------- the sheets ----------
  step(
    /^the "Bot Info" sheet has these rows:$/,
    (table: Record<string, string>[]) => {
      world.sheets[PUBLIC_SHEET] = { [BOT_TAB]: rowsOf(table) };
    }
  );
  step(/^the public sheet has no "Bot Info" tab$/, () => {
    world.sheets[PUBLIC_SHEET] = { "Bot Locations": [] };
  });
  step(/^the "Bot Info" tab can't be read$/, () => {
    world.sheets[PUBLIC_SHEET] = {
      [BOT_TAB]: new Error("Google Sheets didn't answer"),
    };
  });
  step(
    /^the "Bot Info" sheet has a (\w+) named with spaces around it: "(.*)"$/,
    (klass: string, name: string) => {
      world.sheets[PUBLIC_SHEET] = {
        [BOT_TAB]: rowsOf([{ row: "2", Name: ` ${name} `, Class: klass }]),
      };
    }
  );
  step(
    /^the shared accounts sheet has these rows:$/,
    (table: Record<string, string>[]) => {
      world.sheets["accounts-sheet"] = { Accounts: rowsOf(table) };
    }
  );

  // ---------- the database ----------
  step(/^these bots are stored:$/, async (table: Record<string, string>[]) => {
    await prismaClient.bot.createMany({
      data: table.map((b) => ({
        name: b.name ?? "",
        class: b.class ?? "",
        level: b.level ?? "",
        location: b.location ?? "",
        currentPilot: "",
        checkoutTime: "",
        bindLocation: "",
        requiredRoles: [],
        factioned: false,
      })),
    });
  });
  step(/^the stored bots are:$/, async (table: Record<string, string>[]) => {
    const stored = await prismaClient.bot.findMany({
      orderBy: { name: "asc" },
    });
    const columns = Object.keys(table[0] ?? { name: "" });
    const shown = stored.map((b) => {
      const cells: Record<string, string> = {
        name: b.name,
        class: b.class,
        level: b.level,
        location: b.location,
        pilot: b.currentPilot,
        bind: b.bindLocation,
        factioned: b.factioned ? "yes" : "no",
        checkout: b.checkoutTime,
        faction: b.faction,
        "required roles": b.requiredRoles.join(", "),
      };
      return Object.fromEntries(columns.map((c) => [c, cells[c]]));
    });
    expect(shown, world.logs.join("\n")).toEqual(table);
  });

  // ---------- Discord ----------
  step(/^Discord can't be reached$/, () => {
    world.discordDown = true;
  });
  step(/^Discord can be reached again$/, () => {
    world.discordDown = false;
  });
  step(/^raid chat is told:$/, (text: string) =>
    expect(raidChat().at(-1)).toBe(text)
  );
  step(/^raid chat is told that:$/, (text: string) =>
    expect(raidChat().at(-1)).toContain(text)
  );
  step(/^raid chat has been told (\d+) times?$/, (n: string) =>
    expect(raidChat()).toHaveLength(Number(n))
  );
  step(/^raid chat is told nothing$/, () => expect(raidChat()).toEqual([]));

  // ---------- the bot ----------
  step(/^the bot starts$/, async () => {
    const { PrismaPublicAccounts } = await import("../services/bot/bot-prisma");
    bots = new PrismaPublicAccounts();
    // A load still running when a scenario fails mustn't land in the next one.
    world.restore.push(loaded);
    await loaded();
  });
  step(/^(\d+) minutes? pass(?:es)?$/, async (n: string) => {
    for (let i = 0; i < Number(n); i++) {
      await vi.advanceTimersByTimeAsync(MINUTE);
      await loaded();
    }
  });
  step(/^bot commands are on$/, () =>
    expect(bots.guardReady()).resolves.toBeUndefined()
  );
  step(/^bot commands are off, saying:$/, (text: string) =>
    expect(bots.guardReady()).rejects.toMatchObject({ message: text })
  );
  step(/^the log says "(.*)"$/, (text: string) =>
    expect(world.logs.join("\n")).toContain(text)
  );
};
