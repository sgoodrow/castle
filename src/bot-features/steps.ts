// The steps the bot's features are written in. Each is what the guild's members, its officers or
// the sheets they keep do or see. The bot's own code runs for real, on a real database; only Discord
// and Google Sheets are stand-ins (world.ts).
import { DAYS } from "../shared/time";
import { prismaClient } from "..";
import type { DefineStep } from "../testing/gherkin";
import type { PrismaPublicAccounts } from "../services/bot/bot-prisma";
import {
  BOT_ID,
  closedDms,
  newId,
  post,
  world,
  type Message,
  type Row,
} from "./world";
import { commandOpening } from "../features/bank-request-info/bank-request";
import { planId, type Via } from "../shared/bank-plan-id";
import itemdb from "../../bank/data/itemdb.json";

const MINUTE = 60 * 1000;
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
const daysAgo = (days?: string) => Number(days ?? 0) * DAYS;

// The item a scenario names, from the item database the bank page reads. A name more than one
// item shares would make the scenario ambiguous, so it isn't allowed.
const itemId = (name: string) => {
  const ids = Object.entries(itemdb as Record<string, { name: string }>)
    .filter(([, it]) => it.name === name)
    .map(([id]) => Number(id));
  if (ids.length !== 1 || ids[0] === undefined)
    throw new Error(`"${name}" is ${ids.length} items in the item database`);
  return ids[0];
};

// How a request's line is filled, as a scenario says it.
const VIA = new Map<string, Via>([
  ["the bank", "bank"],
  ["DKP auction", "auction"],
  ["multiquest", "multiquest"],
]);
const via = (from: string) => {
  const v = VIA.get(from);
  if (!v) throw new Error(`"${from}" isn't a way to fill a line`);
  return v;
};

// A spot as a banker reads it, "pack 2, slot 5", as the mules' uploads write it, "General2-Slot5".
const SPOTS: [RegExp, string][] = [
  [/^pack (\d+), slot (\d+)$/, "General$1-Slot$2"],
  [/^inventory (\d+)$/, "General$1"],
  [/^bank bag (\d+), slot (\d+)$/, "Bank$1-Slot$2"],
  [/^bank (\d+)$/, "Bank$1"],
];
const uploadedSpot = (where: string) => {
  const found = SPOTS.find(([re]) => re.test(where));
  if (!found)
    throw new Error(`"${where}" isn't a spot in a character's inventory`);
  return where.replace(found[0], found[1]);
};

// Slots as a mule's inventory upload stores them: characters by their lowercase name, and a slot
// with no count left without one.
const holdInBank = async (
  slots: { character: string; where: string; item: string; count: string }[]
) => {
  for (const s of slots) {
    const name = s.character.toLowerCase();
    const id = itemId(s.item);
    await prismaClient.char.upsert({
      where: { name },
      create: { name, charType: "bank" },
      update: {},
    });
    await prismaClient.item.upsert({
      where: { id },
      create: { id, name: s.item },
      update: {},
    });
    const slot = uploadedSpot(s.where);
    await prismaClient.slot.create({
      data: {
        charName: name,
        slot,
        charSlot: name + slot,
        itemId: id,
        count: s.count === "" ? null : Number(s.count),
      },
    });
  }
};

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
  step(/^Discord can't deliver DMs$/, () => {
    world.dmsDown = true;
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
    /^(\w+) is a Castle (member|banker|officer|mod|jeweler)$/,
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
    /^(\w+) placed a jewelry request in #(\S+)(?: (\d+) days ago)?:$/,
    (
      name: string,
      channel: string,
      days: string | undefined,
      lines: string
    ) => {
      const { id } = member(name);
      post(
        channel,
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
  // A member's own message, which reads like a request but isn't the bot's.
  step(
    /^(\w+) typed in #(\S+):$/,
    (name: string, channel: string, text: string) => {
      post(channel, member(name).id, { content: named(text) });
    }
  );
  // A member's own message that also carries a bank page's embed, which only the bot's posts should count as.
  step(
    /^(\w+) typed in #(\S+) with a bank page embed:$/,
    (name: string, channel: string, text: string) => {
      const { id } = member(name);
      post(channel, id, {
        content: named(text),
        embeds: [
          {
            title: `@${name} has placed a bank request`,
            url: `https://discord.com/users/${id}`,
            description: "• Pearl (free)",
          },
        ],
      });
    }
  );
  step(
    /^(\w+) typed in #(\S+) with an attachment "(.*)"$/,
    (name: string, channel: string, url: string) => {
      post(channel, member(name).id, { attachments: [url] });
    }
  );
  step(
    /^(\w+) reacts (✅|❌) to (\w+)'s typed message in #(\S+)$/,
    async (by: string, emoji: string, whose: string, channel: string) => {
      const { tryBankRequestComplete } =
        await import("../features/bank-inventory/actions/bank-request-complete-reaction");
      const message = (world.channels[channel] ?? []).findLast(
        (m) => m.author.id === member(whose).id
      );
      if (!message)
        throw new Error(`${whose} has typed no message in #${channel}`);
      const user = { id: member(by).id, toString: () => `<@${member(by).id}>` };
      await tryBankRequestComplete(
        { partial: false, emoji: { name: emoji }, message } as never,
        user as never
      );
      // A handler error is swallowed, so a scenario that expects nothing checks for the bot's ⚠️.
      const errors = (world.channels[channel] ?? []).filter((m) =>
        m.content.startsWith("⚠️")
      );
      expect(errors.map((m) => m.content)).toEqual([]);
    }
  );
  step(
    /^(\w+)'s typed message is (still|no longer) in #(\S+)$/,
    (name: string, still: string, channel: string) => {
      const remaining = (world.channels[channel] ?? []).filter(
        (m) => m.author.id === member(name).id && !m.gone
      );
      expect(remaining).toHaveLength(still === "still" ? 1 : 0);
    }
  );
  // A request that @mentions someone besides its member, as /bank request can.
  step(
    /^(\w+) placed a jewelry request in #(\S+) mentioning (\w+):$/,
    (name: string, channel: string, other: string, lines: string) => {
      post(channel, BOT_ID, {
        content: `${commandOpening(`<@${member(name).id}>`)} ${lines.trim()} <@${member(other).id}>`,
      });
    }
  );
  step(/^the bot's jewelry instructions are in #jewelry-requests$/, () => {
    post("jewelry-requests", BOT_ID, {
      embeds: [
        { title: "Jewelry requests", description: "How to ask for jewelry" },
      ],
    });
  });
  step(/^the bot's instructions are in #bank-requests$/, () => {
    post("bank-requests", BOT_ID, {
      embeds: [
        {
          title: "Castle Bank Inventory",
          description: "How to ask for a bank request",
        },
      ],
    });
  });
  step(/^the bot's jewelry instructions are still in #jewelry-requests$/, () =>
    expect(
      (world.channels["jewelry-requests"] ?? []).filter(
        (m) => m.embeds[0]?.title === "Jewelry requests" && !m.gone
      )
    ).toHaveLength(1)
  );
  step(
    /^(\w+) reacts (✅|❌) to the bot's instructions in #(\S+)$/,
    async (by: string, emoji: string, channel: string) => {
      const { tryBankRequestComplete } =
        await import("../features/bank-inventory/actions/bank-request-complete-reaction");
      const message = (world.channels[channel] ?? []).findLast(
        (m) => m.author.id === BOT_ID
      );
      if (!message) throw new Error(`no bot message in #${channel}`);
      const user = { id: member(by).id, toString: () => `<@${member(by).id}>` };
      await tryBankRequestComplete(
        { partial: false, emoji: { name: emoji }, message } as never,
        user as never
      );
      // A handler error is swallowed, so a scenario that expects nothing checks for the bot's ⚠️.
      expect(
        (world.channels[channel] ?? [])
          .filter((m) => m.content.startsWith("⚠️"))
          .map((m) => m.content)
      ).toEqual([]);
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
    // The handler reports its errors with console.error rather than throwing, so a scenario must
    // fail on one, or a negative like "no one is sent a DM" would pass with the handler broken.
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expireOldBankRequests({});
      expect(errors.mock.calls).toEqual([]);
    } finally {
      errors.mockRestore();
    }
  });
  step(
    /^(\w+)'s request is (still|no longer) in #(\S+)$/,
    (name: string, still: string, channel: string) => {
      // requestOf finds deleted ones too
      expect(requestOf(name, channel).gone).toBe(still !== "still");
    }
  );
  step(/^the post "(.*)" is still in #bank-requests$/, (text: string) => {
    const found = (world.channels["bank-requests"] ?? []).filter(
      (m) => m.content === text
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.gone).toBe(false);
  });
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
    /^(\w+) is sent a DM starting "(.*)" and quoting "(.*)"$/,
    (name: string, opening: string, quoted: string) => {
      const [dm, ...more] = world.dms.filter((d) => d.to === name);
      expect(more).toEqual([]);
      expect(dm?.text.startsWith(opening)).toBe(true);
      expect(dm?.text).toContain(`> ${quoted}`);
    }
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

  // ---------- a bank request's plan ----------
  step(
    /^the bank (?:now )?holds:$/,
    async (
      table: { character: string; where: string; item: string; count: string }[]
    ) => {
      // "now" replaces what the bank held, as a new upload does.
      await prismaClient.slot.deleteMany();
      await holdInBank(table);
    }
  );
  step(
    /^the bank holds 1 (.+) in each of (\d+) bank bag slots on (\w+)$/,
    async (item: string, n: string, character: string) =>
      holdInBank(
        Array.from({ length: Number(n) }, (_, i) => ({
          character,
          where: `bank bag ${Math.floor(i / 10) + 1}, slot ${(i % 10) + 1}`,
          item,
          count: "1",
        }))
      )
  );
  step(
    /^(\w+)'s bank request has the "DM me the plan" button for:$/,
    (name: string, table: Record<string, string>[]) => {
      const { id } = member(name);
      const customId = planId(
        table.map((l) => ({
          id: itemId(l.item ?? ""),
          qty: Number(l.quantity),
          via: via(l.from ?? "the bank"),
        }))
      );
      if (!customId) throw new Error("the request's lines don't fit a button");
      post("bank-requests", BOT_ID, {
        embeds: [
          {
            title: `@${name} has placed a bank request`,
            url: `https://discord.com/users/${id}`,
            description: "**Total: 800pp**",
          },
        ],
        buttons: [{ label: "DM me the plan", customId }],
      });
    }
  );
  // A bank post as the site posts it, with its plan kept by the post's message for a 👀 to send.
  step(
    /^(\w+)'s bank request is saved with a plan for:$/,
    async (name: string, table: Record<string, string>[]) => {
      const { id } = member(name);
      const customId = planId(
        table.map((l) => ({
          id: itemId(l.item ?? ""),
          qty: Number(l.quantity),
          via: via(l.from ?? "the bank"),
        }))
      );
      if (!customId) throw new Error("the request's lines don't fit a plan");
      const message = post("bank-requests", BOT_ID, {
        embeds: [
          {
            title: `@${name} has placed a bank request`,
            url: `https://discord.com/users/${id}`,
            description: "**Total: 800pp**",
          },
        ],
      });
      await prismaClient.bank_request_plan.create({
        data: { message_id: message.id, plan: customId },
      });
    }
  );
  step(
    /^(\w+)'s bank request has an unreadable "DM me the plan" button$/,
    (name: string) => {
      const { id } = member(name);
      post("bank-requests", BOT_ID, {
        embeds: [
          {
            title: `@${name} has placed a bank request`,
            url: `https://discord.com/users/${id}`,
            description: "**Total: 800pp**",
          },
        ],
        buttons: [{ label: "DM me the plan", customId: "bank-plan:!!" }],
      });
    }
  );
  step(/^(\w+)'s bank request has no plan$/, (name: string) => {
    const { id } = member(name);
    post("bank-requests", BOT_ID, {
      embeds: [
        {
          title: `@${name} has placed a bank request`,
          url: `https://discord.com/users/${id}`,
          description: "**Total: 800pp**",
        },
      ],
    });
  });
  // A member as discord.js gives a reaction's user: DMs reach them as Discord delivers them.
  const reactor = (name: string) => {
    const { id, takesDms } = member(name);
    return {
      id,
      partial: false,
      toString: () => `<@${id}>`,
      send: async (text: string) => {
        if (world.dmsDown) throw new Error("Discord didn't deliver it");
        if (!takesDms) throw closedDms();
        world.dms.push({ to: name, text });
      },
    };
  };
  step(
    /^(\w+) reacts (👀|👍) to (\w+)'s request$/,
    async (by: string, emoji: string, whose: string) => {
      const { tryBankPlanReaction } =
        await import("../features/bank-request-info/bank-plan-reaction");
      const message = requestOf(whose);
      // The handler reports what it can't do with console.error rather than throwing, so a scenario
      // must fail on one, or a negative like "no one is sent a DM" would pass with the handler broken.
      // The one it logs when a DM can't be delivered is the only error a scenario may expect.
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await tryBankPlanReaction(
          { partial: false, emoji: { name: emoji }, message } as never,
          reactor(by) as never
        );
        expect(errors.mock.calls.map((c) => String(c[0]))).toEqual(
          world.dmsDown ? [expect.stringContaining("a DM failed")] : []
        );
      } finally {
        errors.mockRestore();
      }
    }
  );
  step(/^(\w+) is told nothing$/, (name: string) =>
    expect(world.told.filter((t) => t.to === name)).toEqual([])
  );
  step(
    /^(\w+) presses "(.+)" on (\w+)'s request$/,
    async (by: string, label: string, whose: string) => {
      const { interactionCreateListener } =
        await import("../listeners/interaction-create-listener");
      const button = requestOf(whose).buttons.find((b) => b.label === label);
      if (!button)
        throw new Error(`${whose}'s request has no "${label}" button`);
      const presser = member(by);
      const state = { deferred: false, replied: false };
      const tell = async (reply: string | { content?: string }) => {
        const text = typeof reply === "string" ? reply : (reply.content ?? "");
        world.told.push({ to: by, text });
      };
      // A button press as discord.js gives it, answered only to the member who pressed it.
      const interaction = {
        isAutocomplete: () => false,
        isButton: () => true,
        isChatInputCommand: () => false,
        customId: button.customId,
        createdTimestamp: Date.now(),
        get deferred() {
          return state.deferred;
        },
        get replied() {
          return state.replied;
        },
        member: {
          roles: {
            cache: {
              get: (role: string) =>
                presser.roles.includes(role) ? { id: role } : undefined,
              has: (role: string) => presser.roles.includes(role),
            },
          },
        },
        user: {
          id: presser.id,
          send: async (text: string) => {
            if (world.dmsDown) throw new Error("Discord didn't deliver it");
            if (!presser.takesDms) throw closedDms();
            world.dms.push({ to: by, text });
          },
        },
        deferReply: async () => {
          state.deferred = true;
        },
        editReply: tell,
        reply: async (reply: string | { content?: string }) => {
          state.replied = true;
          await tell(reply);
        },
      };
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        await interactionCreateListener(interaction as never);
      } finally {
        errors.mockRestore();
      }
    }
  );
  // A role mention reads as the role's name, as Discord shows it: <@&banker> is "@Banker".
  step(/^(\w+) is told "(.*)"$/, (name: string, text: string) =>
    expect(
      world.told
        .filter((t) => t.to === name)
        .map((t) =>
          t.text.replace(
            /<@&(\w)(\w*)>/g,
            (_, first: string, rest: string) => `@${first.toUpperCase()}${rest}`
          )
        )
    ).toEqual([text])
  );
  step(/^nothing new is posted in #bank-requests$/, () =>
    expect(
      (world.channels["bank-requests"] ?? []).filter(
        (m) => !m.embeds[0]?.url?.startsWith("https://discord.com/users/")
      )
    ).toEqual([])
  );
  step(
    /^(\w+) is sent (\d+) DMs of at most ([\d,]+) characters$/,
    (name: string, n: string, max: string) => {
      const dms = world.dms.filter((d) => d.to === name);
      expect(dms).toHaveLength(Number(n));
      for (const dm of dms)
        expect(dm.text.length).toBeLessThanOrEqual(
          Number(max.replace(",", ""))
        );
    }
  );
  step(
    /^(\w+)'s second DM opens with "(.*)"$/,
    (name: string, opening: string) =>
      expect(
        world.dms.filter((d) => d.to === name)[1]?.text.split("\n")[0]
      ).toBe(opening)
  );
  step(
    /^(\w+)'s DMs list (\d+) (.+)s$/,
    (name: string, n: string, item: string) => {
      const lines = world.dms
        .filter((d) => d.to === name)
        .flatMap((d) => d.text.split("\n"))
        .flatMap((l) => {
          const m = l.match(/^• (?:(\d+) × )?(.+) in /);
          return m?.[2] === item ? [Number(m[1] ?? 1)] : [];
        });
      expect(lines.reduce((a, b) => a + b, 0)).toBe(Number(n));
    }
  );

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
