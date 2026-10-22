// The steps the bot's features are written in. Each is what the guild's members, its officers or
// the sheets they keep do or see. The bot's own code runs for real, on a real database; only Discord
// and Google Sheets are stand-ins (world.ts).
import { prismaClient } from "..";
import type { DefineStep } from "../testing/gherkin";
import type { PrismaPublicAccounts } from "../services/bot/bot-prisma";
import { BOT_ID, newId, post, world, type Message, type Row } from "./world";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const PUBLIC_SHEET = "public-sheet";
const BOT_TAB = "Bot Info";

let bots: PrismaPublicAccounts | undefined;
// The bot this scenario started; a scenario that never starts it has no bot to ask.
const started = () => {
  if (!bots) throw new Error("the bot has not started in this scenario");
  return bots;
};

// Rows as Google Sheets gives them: a table's "row" column is the sheet's row number, and its other
// columns are the tab's, in order. Like the real API, a row's blank cells after its last filled one
// come back missing, not "".
const rowsOf = (table: Record<string, string>[]): Row[] =>
  table.map(({ row, ...cells }) => {
    const filled = Object.entries(cells);
    let end = filled.length;
    while (end > 0 && !filled[end - 1][1]) end--;
    return {
      ...Object.fromEntries(filled.slice(0, end)),
      rowIndex: Number(row),
    } as Row;
  });

// Until the bot has finished loading the bots, and told raid chat whatever it tells it.
const loaded = async () => {
  await started()
    .guardReady()
    .catch(() => undefined);
  await new Promise((r) => setImmediate(r));
};

const raidChat = () =>
  (world.channels["raid-chat"] ?? []).map((m) => m.content);

const member = (name: string) => {
  const found = world.members[name];
  if (!found) throw new Error(`No one called ${name} is in the scenario`);
  return found;
};
const daysAgo = (days?: string) => Number(days ?? 0) * DAY;

// The latest of a member's bank requests in a channel, whichever way it was posted.
const requestOf = (name: string, channel = "bank-requests") => {
  const { id } = member(name);
  const found = (world.channels[channel] ?? []).findLast(
    (m) =>
      m.author.id === BOT_ID &&
      (m.content.includes(`<@${id}>`) ||
        m.embeds.some(
          (e) =>
            e.url?.endsWith(`/${id}`) || e.description?.includes(`<@${id}>`)
        ))
  );
  if (!found) throw new Error(`${name} has no request in #${channel}`);
  return found;
};

// Every so often the bot's own code waits on another promise; this lets everything it started run.
const idle = async () => {
  for (let i = 0; i < 50; i++) await new Promise((r) => setImmediate(r));
};

// The scenario names its members, as in <@Alice>; the bot sees their ids.
const named = (text: string) =>
  Object.values(world.members).reduce(
    (t, m) =>
      t
        .replaceAll(`<@${m.name}>`, `<@${m.id}>`)
        .replaceAll(`users/${m.name}`, `users/${m.id}`),
    text
  );

const shown = (m: Message, columns: string[]) => {
  const embed = m.embeds[0];
  const cells: Record<string, string> = {
    content: m.content,
    title: embed?.title ?? "",
    url: embed?.url ?? "",
    description: embed?.description ?? "",
    pings: m.pings ? "yes" : "no",
  };
  return Object.fromEntries(columns.map((c) => [c, cells[c]]));
};

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
    /^the "Bot Info" sheet has a (\w+) with spaces around its class: "(.*)"$/,
    (klass: string, name: string) => {
      world.sheets[PUBLIC_SHEET] = {
        [BOT_TAB]: rowsOf([{ row: "2", Name: name, Class: ` ${klass} ` }]),
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

  // ---------- members ----------
  step(
    /^(\w+) is a Castle (member|banker|officer|mod)$/,
    (name: string, role: string) => {
      world.members[name] = {
        id: newId(),
        name,
        roles: role === "member" ? [] : [role],
        takesDms: true,
      };
    }
  );
  step(/^(\w+) doesn't take DMs$/, (name: string) => {
    member(name).takesDms = false;
  });

  // ---------- bank requests ----------
  step(
    /^(\w+) placed a bank request on the bank page(?: (\d+) days ago)?:$/,
    (name: string, days: string | undefined, lines: string) => {
      const { id } = member(name);
      post(
        "bank-requests",
        BOT_ID,
        {
          embeds: [
            {
              title: `@${name} has placed a bank request`,
              url: `https://discord.com/users/${id}`,
              description: lines,
            },
          ],
        },
        daysAgo(days)
      );
    }
  );
  step(
    /^(\w+) placed a bank request on the bank page before titles named members:$/,
    (name: string, lines: string) => {
      const { id } = member(name);
      post("bank-requests", BOT_ID, {
        embeds: [
          { description: `<@${id}> has placed a bank request.\n\n${lines}` },
        ],
      });
    }
  );
  step(
    /^(\w+) placed a bank request with \/bank request(?: in #(\S+))?(?: (\d+) days ago)?: "(.*)"$/,
    (
      name: string,
      channel: string | undefined,
      days: string | undefined,
      text: string
    ) => {
      const { id } = member(name);
      post(
        channel ?? "bank-requests",
        BOT_ID,
        { content: `✍️ <@${id}> requests: ${text}` },
        daysAgo(days)
      );
    }
  );
  step(
    /^(\w+) placed a bank request on the bank page (\d+) days ago for (\d+) lines$/,
    (name: string, days: string, lines: string) => {
      const { id } = member(name);
      post(
        "bank-requests",
        BOT_ID,
        {
          embeds: [
            {
              title: `@${name} has placed a bank request`,
              url: `https://discord.com/users/${id}`,
              description: "• Cloak of Flames (800p)\n".repeat(Number(lines)),
            },
          ],
        },
        daysAgo(days)
      );
    }
  );
  step(/^the bot's instructions are still in #bank-requests$/, () =>
    expect(
      (world.channels["bank-requests"] ?? []).filter(
        (m) => m.embeds[0]?.title === "Castle Bank Inventory" && !m.gone
      )
    ).toHaveLength(1)
  );
  step(
    /^(\w+)'s \/bank request also has an embed titled "(.*)"$/,
    (name: string, title: string) => {
      requestOf(name).embeds.push({ title });
    }
  );
  step(
    /^(\w+) posted in #bank-requests (\d+) days ago: "(.*)"$/,
    (name: string, days: string, content: string) => {
      post("bank-requests", member(name).id, { content }, daysAgo(days));
    }
  );
  step(
    /^(\w+) copied a bank page request into #bank-requests (\d+) days ago$/,
    (name: string, days: string) => {
      const { id } = member(name);
      post(
        "bank-requests",
        id,
        {
          embeds: [
            {
              title: `@${name} has placed a bank request`,
              url: `https://discord.com/users/${id}`,
              description: "• Cloak of Flames (800p)",
            },
          ],
        },
        daysAgo(days)
      );
    }
  );
  step(
    /^the bot's instructions have been in #bank-requests for (\d+) days$/,
    (days: string) => {
      post(
        "bank-requests",
        BOT_ID,
        {
          embeds: [
            {
              title: "Castle Bank Inventory",
              url: "https://bank.example.com",
              description: "• Spells",
            },
          ],
        },
        daysAgo(days)
      );
    }
  );
  step(/^(\d+) newer posts follow in #bank-requests$/, (n: string) => {
    for (let i = 0; i < Number(n); i++)
      post("bank-requests", BOT_ID, { content: `Post ${i}` });
  });
  step(
    /^a banker removes (\w+)'s request as the cleanup reaches it$/,
    (name: string) => {
      const request = requestOf(name);
      request.delete = async () => {
        request.gone = true;
        throw new Error("Unknown Message");
      };
    }
  );
  step(
    /^(\w+) reacts (✅|❌) to (\w+)'s request(?: in #(\S+))?$/,
    async (by: string, emoji: string, whose: string, channel?: string) => {
      const { tryBankRequestComplete } =
        await import("../features/bank-inventory/actions/bank-request-complete-reaction");
      const message = requestOf(whose, channel);
      const user = { id: member(by).id, toString: () => `<@${member(by).id}>` };
      await tryBankRequestComplete(
        { partial: false, emoji: { name: emoji }, message } as never,
        user as never
      );
      // The bot replies ⚠️ to a request it couldn't handle: no scenario here expects one.
      const errors = (world.channels[message.channel.id] ?? []).filter((m) =>
        m.content.startsWith("⚠️")
      );
      expect(errors.map((m) => m.content)).toEqual([]);
    }
  );
  step(/^the bot clears out old bank requests$/, async () => {
    const { expireOldBankRequests } =
      await import("../features/bank-request-info/expire-old-requests");
    expireOldBankRequests({});
    await idle();
  });
  step(
    /^(\w+)'s request is (still|no longer) in #(\S+)$/,
    (name: string, still: string, channel: string) => {
      // requestOf finds deleted ones too
      expect(requestOf(name, channel).gone).toBe(still !== "still");
    }
  );
  step(
    /^(\w+)'s requests are (still|no longer) in #bank-requests$/,
    (name: string, still: string) => {
      const { id } = member(name);
      const theirs = (world.channels["bank-requests"] ?? []).filter(
        (m) =>
          m.content.includes(`<@${id}>`) ||
          m.embeds.some((e) => e.url?.endsWith(`/${id}`))
      );
      expect(theirs.length).toBeGreaterThan(0);
      expect(theirs.map((m) => m.gone)).toEqual(
        theirs.map(() => still !== "still")
      );
    }
  );
  step(
    /^the bot posts in #(\S+):$/,
    (channel: string, table: Record<string, string>[]) => {
      const columns = Object.keys(table[0] ?? {});
      const posts = (world.channels[channel] ?? [])
        .filter((m) => m.author.id === BOT_ID)
        .map((m) => shown(m, columns));
      expect(posts).toEqual(
        table.map((row) =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k, named(v)]))
        )
      );
    }
  );
  step(/^nothing is posted in #(\S+)$/, (channel: string) =>
    expect(world.channels[channel] ?? []).toEqual([])
  );
  step(/^(\w+) is sent a DM:$/, (name: string, text: string) =>
    expect(world.dms.filter((d) => d.to === name).map((d) => d.text)).toEqual([
      named(text),
    ])
  );
  step(/^no DM is sent to (\w+)$/, (name: string) =>
    expect(world.dms.filter((d) => d.to === name)).toEqual([])
  );
  step(
    /^(\w+) is sent a DM of at most ([\d,]+) characters$/,
    (name: string, n: string) => {
      const [dm, ...more] = world.dms.filter((d) => d.to === name);
      expect(more).toEqual([]);
      expect(dm?.text.length).toBeLessThanOrEqual(Number(n.replace(",", "")));
    }
  );
  step(/^no one is sent a DM$/, () => expect(world.dms).toEqual([]));

  // ---------- the bot ----------
  step(/^the bot starts$/, async () => {
    const { PrismaPublicAccounts } = await import("../services/bot/bot-prisma");
    bots = new PrismaPublicAccounts();
    world.restore.push(() => {
      bots = undefined;
    });
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
    expect(started().guardReady()).resolves.toBeUndefined()
  );
  step(/^bot commands are off, saying:$/, (text: string) =>
    expect(started().guardReady()).rejects.toMatchObject({ message: text })
  );
  step(/^the log says "(.*)"$/, (text: string) =>
    expect(world.logs.join("\n")).toContain(text)
  );
  step(/^the log doesn't say "(.*)"$/, (text: string) =>
    expect(world.logs.join("\n")).not.toContain(text)
  );
};
