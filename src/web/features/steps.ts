// The steps the web process's features are written in. Each is what a visitor, a member or the
// people running the site do or see. The server runs for real on a local port, with the real
// sign-in, bank, wiki cache and error reports; only the database and the outside services
// (Discord, GitHub, the P99 wiki) are stand-ins.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import http, { Server } from "http";
import { AddressInfo, createServer as netServer } from "net";
import os from "os";
import path from "path";
import { SourceMapGenerator } from "source-map";
import { StepDefinitions } from "jest-cucumber";

type Slot = {
  charName: string;
  slot: string;
  itemId: number;
  count: number | null;
  updatedAt: Date;
  item: { name: string; price: string | null } | null;
};
type Answer = { status: number; headers: Headers; body: Buffer };
type Issue = { title: string; body: string; labels: string[] };
type Member = { id: string; name: string; roles: string[] } | null;

const ITEMDB: Record<
  string,
  { name: string; nodrop?: boolean; icon?: number; [k: string]: unknown }
> = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../bank/data/itemdb.json"),
    "utf-8"
  )
);
const SPELLS: Record<string, { name: string }> = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../bank/data/spells.json"),
    "utf-8"
  )
);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
]);
const SCRIPT_TAG = '<script type="module" crossorigin>';
// The built page's script starts on its second line; the source map says it came from bankPage in app.tsx.
const PAGE = `<!doctype html><title>Castle Guild Bank</title><script>rev='__BANK_REV__'</script>\n${SCRIPT_TAG}console.log("bank")</script>`;

export const SIGN_IN = {
  clientId: "client-id",
  guildId: "guild-id",
  discordClientSecret: "client-secret",
  bankWebRoleId: "bank-role",
  bankWebSessionSecret: "session-secret",
  bankWebUrl: "https://bank.example.com",
};
const SETTINGS = [
  "NODE_ENV",
  "GIT_REV",
  "SOURCE_REV",
  "PORT",
  "bankWebDevNoAuth",
  "bankCacheDir",
  "bankDistDir",
  "githubErrorToken",
  "token",
  "bankRequestsChannelId",
  ...Object.keys(SIGN_IN),
];

interface World {
  dir: string;
  env: Record<string, string>;
  slots: Slot[];
  dbDown: unknown;
  members: Record<string, Member>; // who Discord says each sign-in is
  tokenStatus: number;
  jars: Record<string, Map<string, string>>; // cookies, per visitor
  base: string;
  servers: Server[];
  mod: typeof import("../server") | null;
  answer: Answer | null;
  answers: Answer[];
  issues: Issue[];
  comments: string[];
  wiki: string[]; // what the wiki was asked for
  wikiPage: string;
  wikiIcon: number | null;
  posts: { auth: string | null; body: Post }[]; // what the bot posted to #bank-requests
  postStatus: number;
  logs: string[];
  every: number[];
  handlers: Record<string, (err: unknown) => void>;
  exits: number[];
  restore: (() => void)[];
}
let world: World;

// Discord, GitHub and the P99 wiki, as the server reaches them. Requests to this machine go through.
type Route = [
  method: string,
  url: RegExp,
  answer: (req: Request, m: RegExpMatchArray) => Response | Promise<Response>,
];
const json = (body: unknown) => Response.json(body);
interface Post {
  allowed_mentions: unknown;
  embeds: {
    title: string;
    description: string;
    color: number;
    url?: string;
    footer?: { text: string };
    thumbnail?: { url: string };
  }[];
}
const ROUTES: Route[] = [
  [
    "POST",
    /^https:\/\/discord\.com\/api\/v10\/channels\/requests-channel\/messages$/,
    async (req) => {
      world.posts.push({
        auth: req.headers.get("authorization"),
        body: (await req.json()) as Post,
      });
      return new Response(null, { status: world.postStatus });
    },
  ],
  [
    "GET",
    /^https:\/\/api\.github\.com\/search\/issues\?/,
    () => json({ items: [] }),
  ],
  [
    "POST",
    /^https:\/\/api\.github\.com\/repos\/sgoodrow\/castle\/issues$/,
    async (req) => {
      world.issues.push((await req.json()) as Issue);
      return json({ number: world.issues.length });
    },
  ],
  [
    "POST",
    /^https:\/\/api\.github\.com\/repos\/sgoodrow\/castle\/issues\/\d+\/comments$/,
    async (req) => {
      world.comments.push(((await req.json()) as { body: string }).body);
      return json({});
    },
  ],
  [
    "POST",
    /^https:\/\/discord\.com\/api\/v10\/oauth2\/token$/,
    async (req) => {
      const code = new URLSearchParams(await req.text()).get("code")!;
      return world.tokenStatus === 200
        ? json({ access_token: `token-${code}` })
        : new Response(null, { status: world.tokenStatus });
    },
  ],
  [
    "GET",
    /^https:\/\/discord\.com\/api\/v10\/users\/@me\/guilds\/guild-id\/member$/,
    (req) => {
      const m =
        world.members[
          req.headers.get("authorization")!.replace("Bearer token-", "")
        ];
      if (!m) return new Response(null, { status: 404 });
      return json({
        roles: m.roles,
        user: { id: m.id, username: m.name.toLowerCase() },
        nick: m.name,
      });
    },
  ],
  [
    "GET",
    /^https:\/\/wiki\.project1999\.com(\/images\/[^/?]+)$/,
    (_, m) => {
      world.wiki.push(m[1]);
      return new Response(PNG, { headers: { "Content-Type": "image/png" } });
    },
  ],
  [
    "GET",
    /^https:\/\/wiki\.project1999\.com(\/[^/?]+)$/,
    (_, m) => {
      world.wiki.push(m[1]);
      return new Response(world.wikiPage, {
        headers: { "Content-Type": "text/html" },
      });
    },
  ],
];
const realFetch = global.fetch;
export async function outside(
  input: string | URL | Request,
  init?: RequestInit
) {
  const req = new Request(input, init);
  if (new URL(req.url).hostname === "127.0.0.1") return realFetch(input, init);
  for (const [method, url, answer] of ROUTES) {
    const m = req.url.match(url);
    if (m && req.method === method) return answer(req, m);
  }
  throw new Error(`Nothing stands in for ${req.method} ${req.url}`);
}

// A fresh site, database, Discord, GitHub and wiki for every scenario.
export async function reset() {
  if (world) await teardown();
  const dir = mkdtempSync(path.join(os.tmpdir(), "bank-web-"));
  mkdirSync(path.join(dir, "bank/dist"), { recursive: true });
  writeFileSync(path.join(dir, "bank/dist/index.html"), PAGE);
  const map = new SourceMapGenerator({ file: "index.js" });
  map.addMapping({
    generated: { line: 1, column: 0 },
    original: { line: 10, column: 4 },
    source: "../web/src/app.tsx",
    name: "bankPage",
  });
  writeFileSync(path.join(dir, "bank/dist/index-test.js.map"), map.toString());
  world = {
    dir,
    env: {
      NODE_ENV: "test",
      bankCacheDir: path.join(dir, "cache"),
      bankDistDir: path.join(dir, "bank/dist"),
      githubErrorToken: "github-token",
    },
    slots: [],
    dbDown: null,
    members: {},
    tokenStatus: 200,
    jars: {},
    base: "",
    servers: [],
    mod: null,
    answer: null,
    answers: [],
    issues: [],
    comments: [],
    wiki: [],
    wikiPage: "",
    wikiIcon: null,
    posts: [],
    postStatus: 200,
    logs: [],
    every: [],
    handlers: {},
    exits: [],
    restore: [],
  };
  const log = jest
    .spyOn(console, "log")
    .mockImplementation((s: unknown) => void world.logs.push(String(s)));
  world.restore.push(() => log.mockRestore());
}

export async function teardown() {
  for (const r of world.restore.splice(0)) r();
  await Promise.all(world.servers.map((s) => new Promise((r) => s.close(r))));
  rmSync(world.dir, { recursive: true, force: true });
}

// The database: whatever the bankers' inventory uploads put there.
export const findMany = () =>
  world.dbDown
    ? Promise.reject(world.dbDown)
    : Promise.resolve(world.slots.filter((s) => s.itemId > 0));
// Only the crash being tested counts; its backstop timer fires seconds later, into a scenario long gone.
let exits: number[] = [];
export const exit = (code?: number) => void exits.push(code ?? 0);

const itemId = (name: string) => {
  const ids = Object.keys(ITEMDB).filter(
    (id) => ITEMDB[id].name.toLowerCase() === name.toLowerCase()
  );
  if (ids.length > 1)
    throw new Error(`The item database has ${ids.length} items called ${name}`);
  return ids.length
    ? +ids[0]
    : 900000 + [...name].reduce((n, c) => n + c.charCodeAt(0), 0);
};
const quoted = (s: string) => [...s.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
const eventually = async (check: () => void, ms = 5000) => {
  for (
    const until = Date.now() + ms;
    ;
    await new Promise((r) => setTimeout(r, 20))
  ) {
    try {
      return check();
    } catch (e) {
      if (Date.now() > until) throw e;
    }
  }
};
const freePort = () =>
  new Promise<number>((resolve) => {
    const s = netServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as AddressInfo;
      s.close(() => resolve(port));
    });
  });

// The server reads its settings when it loads, so each scenario loads its own copy.
function load() {
  for (const k of SETTINGS) delete process.env[k];
  Object.assign(process.env, world.env);
  jest.isolateModules(() => {
    // isolateModules is synchronous, so this can't be an import().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    world.mod = require("../server");
  });
  return world.mod!;
}

async function site() {
  if (world.base) return world.base;
  const server = http.createServer(load().handle);
  world.servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (world.base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
}

async function request(
  who: string,
  p: string,
  init: RequestInit = {},
  record = true
) {
  const jar = (world.jars[who] ??= new Map());
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch((await site()) + p, {
    redirect: "manual",
    ...init,
    headers: { ...(cookie ? { cookie } : {}), ...(init.headers as object) },
  });
  for (const c of res.headers.getSetCookie()) {
    const [, name, value] = c.match(/^([^=]+)=([^;]*)/)!;
    if (/Max-Age=0\b/.test(c)) jar.delete(name);
    else jar.set(name, value);
  }
  const answer = {
    status: res.status,
    headers: res.headers,
    body: Buffer.from(await res.arrayBuffer()),
  };
  if (record) {
    world.answer = answer;
    world.answers.push(answer);
  }
  return answer;
}
const answer = () => world.answer!;
const text = () => answer().body.toString();
const bank = () =>
  JSON.parse(text()) as {
    snapshot: string;
    today: string;
    bank: [string, string, number, number][];
    items: Record<string, Record<string, unknown>>;
    spells: Record<string, { name: string }>;
  };

async function signIn(who: string) {
  const login = await request(who, "/auth/login", {}, false);
  const state = new URL(login.headers.get("location")!).searchParams.get(
    "state"
  );
  return request(who, `/auth/callback?code=${who}&state=${state}`);
}

const reportOf = (title: string) => {
  const found = world.issues.filter((i) => i.title === title);
  if (!found.length)
    throw new Error(
      `No issue titled ${title}; filed: ${JSON.stringify(world.issues.map((i) => i.title))}`
    );
  return found[found.length - 1];
};
const settle = () => new Promise((r) => setTimeout(r, 100));

export const steps: StepDefinitions = ({ defineStep: step }) => {
  // ---------- how the site is set up ----------
  step(/^the bank site is set up for Discord sign-in$/, () =>
    Object.assign(world.env, SIGN_IN)
  );
  step(/^the bank site isn't set up for sign-in$/, () => {
    for (const k of Object.keys(SIGN_IN)) delete world.env[k];
  });
  step(/^the site is in dev mode without sign-in$/, () => {
    world.env.bankWebDevNoAuth = "true";
  });
  step(/^the site is running in production$/, () => {
    world.env.NODE_ENV = "production";
  });
  step(/^the site is running commit "(.*)"$/, (rev: string) => {
    world.env.SOURCE_REV = rev;
  });
  step(/^the site isn't told which commit it's running$/, () => undefined);
  step(/^the site is told to listen on a free port$/, async () => {
    world.env.PORT = String(await freePort());
  });
  step(/^the site is given no cache folder$/, () => {
    delete world.env.bankCacheDir;
  });

  // ---------- Discord ----------
  step(
    /^(\w+) is a Castle member (with|without) the bank role$/,
    (who: string, has: string) => {
      world.members[who] = {
        id: `id-${who}`,
        name: who,
        roles: has === "with" ? ["castle", "bank-role"] : ["castle"],
      };
    }
  );
  step(/^(\w+) isn't in the Castle Discord server$/, (who: string) => {
    world.members[who] = null;
  });
  step(/^Discord refuses the sign-in$/, () => {
    world.tokenStatus = 401;
  });
  step(/^(\w+) (?:signs|has signed) in with Discord$/, (who: string) =>
    signIn(who)
  );
  step(
    /^(\w+) comes back from Discord with a stale sign-in link$/,
    async (who: string) => {
      await request(who, "/auth/login", {}, false);
      await request(
        who,
        `/auth/callback?code=${who}&state=not-the-one-we-sent`
      );
    }
  );
  step(/^(\w+) cancels signing in on Discord$/, (who: string) =>
    request(who, "/auth/callback?error=access_denied")
  );
  step(/^(\w+) is sent to Discord to sign in$/, () => {
    expect(answer().status).toBe(302);
    const to = new URL(answer().headers.get("location")!);
    expect(to.origin + to.pathname).toBe(
      "https://discord.com/oauth2/authorize"
    );
    expect(to.searchParams.get("client_id")).toBe("client-id");
    expect(to.searchParams.get("redirect_uri")).toBe(
      "https://bank.example.com/auth/callback"
    );
  });
  step(/^(\w+) is sent to "(.*)"$/, (_: string, to: string) => {
    expect(answer().status).toBe(302);
    expect(answer().headers.get("location")).toBe(to);
  });

  // ---------- visiting ----------
  step(
    /^(\w+) (?:visits|has visited|asks for) "(.*)"$/,
    (who: string, p: string) => request(who, p)
  );
  step(/^(\w+) asks for the bank$/, (who: string) => request(who, "/api/bank"));
  step(
    /^(\w+) sends a (PUT|POST|DELETE|HEAD) to "(.*)"$/,
    (who: string, method: string, p: string) =>
      request(who, p, { method, body: method === "POST" ? "{}" : undefined })
  );
  step(/^(\w+) visits each of (".*)$/, async (who: string, paths: string) => {
    world.answers = [];
    for (const p of quoted(paths)) await request(who, p);
  });
  step(
    /^each is answered (\d+) saying "(.*)"$/,
    (status: string, says: string) => {
      expect(world.answers.length).toBeGreaterThan(0);
      for (const a of world.answers) {
        expect(a.status).toBe(+status);
        expect(a.body.toString()).toContain(says);
      }
    }
  );
  step(/^each is answered (\d+)$/, (status: string) => {
    expect(world.answers.length).toBeGreaterThan(0);
    for (const a of world.answers) expect(a.status).toBe(+status);
  });
  step(/^the answer is (\d+)$/, (status: string) =>
    expect(answer().status).toBe(+status)
  );
  step(/^the answer is (\d+) "(.*)"$/, (status: string, body: string) => {
    expect(answer().status).toBe(+status);
    expect(text()).toBe(body);
  });
  step(
    /^the answer is (\d+) saying "(.*)"$/,
    (status: string, says: string) => {
      expect(answer().status).toBe(+status);
      expect(text()).toContain(says);
    }
  );
  step(
    /^the answer is (\d+) with the JSON:$/,
    (status: string, json: string) => {
      expect(answer().status).toBe(+status);
      expect(answer().headers.get("content-type")).toBe("application/json");
      expect(JSON.parse(text())).toEqual(JSON.parse(json));
    }
  );
  step(/^the answer is empty$/, () => expect(answer().body.length).toBe(0));
  step(/^the answer offers to sign in again$/, () =>
    expect(text()).toContain('<a href="/auth/login">Sign in</a>')
  );
  step(/^the answer's (.+) is "(.*)"$/, (header: string, value: string) =>
    expect(answer().headers.get(header)).toBe(value)
  );
  step(/^the answer's (.+) includes "(.*)"$/, (header: string, value: string) =>
    expect(answer().headers.get(header)).toContain(value)
  );
  step(/^the answer is the page built for commit "(.*)"$/, (rev: string) => {
    expect(answer().status).toBe(200);
    expect(text()).toBe(PAGE.replace("__BANK_REV__", rev));
  });
  step(/^the built page is replaced on disk$/, () =>
    writeFileSync(
      path.join(world.dir, "bank/dist/index.html"),
      "<!doctype html><title>A newer build</title>"
    )
  );
  step(/^the log says "(.*)"$/, (line: string) =>
    eventually(() =>
      expect(world.logs.some((l) => l.includes(line))).toBe(true)
    )
  );
  step(/^the log says "(.*)" (\d+) times$/, async (line: string, n: string) => {
    await settle();
    expect(world.logs.filter((l) => l.includes(line))).toHaveLength(+n);
  });

  // ---------- the bank ----------
  step(/^the bankers' uploads hold:$/, (rows: Record<string, string>[]) => {
    for (const r of rows) {
      world.slots.push({
        charName: r.banker,
        slot: r.spot,
        itemId: itemId(r.item),
        count: r.count ? +r.count : null,
        updatedAt: new Date(r.uploaded || "2026-05-01T00:00:00Z"),
        item:
          r.item === "(gone)" ? null : { name: r.item, price: r.price || null },
      });
    }
  });
  step(/^the bankers have uploaded nothing$/, () => {
    world.slots = [];
  });
  // Prisma throws errors, but whatever a failure throws gets filed.
  step(
    /^the bank's database (is down with|throws the bare value) "(.*)"$/,
    (how: string, msg: string) => {
      world.dbDown = how === "is down with" ? new Error(msg) : msg;
    }
  );
  step(/^the bank lists:$/, (rows: Record<string, string>[]) => {
    const b = bank();
    expect(
      b.bank.map(([banker, spot, id, count]) => ({
        banker,
        spot,
        item: b.items[id].name,
        count: String(count),
      }))
    ).toEqual(rows);
  });
  step(/^the bank lists nothing$/, () => {
    expect(bank().bank).toEqual([]);
    expect(bank().items).toEqual({});
  });
  step(
    /^the bank describes "(.*)" by the item database, under that name$/,
    (name: string) => {
      const id = itemId(name);
      expect(bank().items[id]).toEqual({ ...ITEMDB[id], name });
    }
  );
  step(/^the bank describes "(.*)" as unknown$/, (name: string) =>
    expect(bank().items[itemId(name)]).toEqual({ unknown: true, name })
  );
  step(
    /^the bank describes "(.*)" with:$/,
    (name: string, rows: Record<string, string>[]) => {
      const it = bank().items[itemId(name)];
      for (const r of rows) expect(it[r.field]).toEqual(JSON.parse(r.value));
    }
  );
  step(/^the bank sends the spells (".*)$/, (names: string) => {
    expect(
      Object.values(bank().spells)
        .map((s) => s.name)
        .sort()
    ).toEqual(quoted(names).sort());
    for (const [id, s] of Object.entries(bank().spells))
      expect(s).toEqual(SPELLS[id]);
  });
  step(/^the bank describes (\d+) items?$/, (n: string) =>
    expect(Object.keys(bank().items)).toHaveLength(+n)
  );
  step(/^the bank is dated "(.*)"$/, (when: string) => {
    expect(bank().snapshot).toBe(when);
    expect(bank().today).toBe(new Date().toISOString().slice(0, 10));
  });
  step(/^the bank is dated now$/, () => {
    expect(Math.abs(Date.parse(bank().snapshot) - Date.now())).toBeLessThan(
      10000
    );
    expect(bank().today).toBe(new Date().toISOString().slice(0, 10));
  });

  // ---------- the wiki ----------
  step(
    /^the wiki cache has the page for "(.*)" with icon (\d+) and these Green sales:$/,
    (name: string, icon: string, rows: Record<string, string>[]) => {
      mkdirSync(path.join(world.dir, "cache/wiki"), { recursive: true });
      const rec = {
        url: `https://wiki.project1999.com/${name.replace(/ /g, "_")}`,
        icon: +icon,
        green: rows.map((r) => [r.date, r.seller, +r.price]),
        fetchedAt: Date.now(),
      };
      writeFileSync(
        path.join(world.dir, "cache/wiki", `${itemId(name)}.json`),
        JSON.stringify(rec)
      );
    }
  );
  step(/^the wiki cache has icon (\d+)$/, (icon: string) => {
    mkdirSync(path.join(world.dir, "cache/icons"), { recursive: true });
    writeFileSync(path.join(world.dir, "cache/icons", `${icon}.png`), PNG);
  });
  step(/^the answer is the PNG for icon (\d+)$/, () => {
    expect(answer().status).toBe(200);
    expect(answer().headers.get("content-type")).toBe("image/png");
    expect(answer().body).toEqual(PNG);
  });
  step(
    /^the wiki's pages show icon (\d+) and these Green sales:$/,
    (icon: string, rows: Record<string, string>[]) => {
      const cells = rows
        .map(
          (r) =>
            `<tr><td>${r.date}</td><td>${r.seller}</td><td>${r.price}</td></tr>`
        )
        .join("");
      world.wikiIcon = +icon;
      world.wikiPage = `<div class="itemicon"><img src="/images/Item_${icon}.png"></div><h2>Project 1999 Auction Tracker (Green)</h2><table>${cells}</table>Last 20 Recorded Auctions`;
    }
  );
  step(/^the wiki has been asked for (".*)$/, (pages: string) => {
    expect(world.wiki.filter((p) => !p.startsWith("/images/")).sort()).toEqual(
      quoted(pages).sort()
    );
  });
  step(/^the wiki has been asked for the icons (".*)$/, (icons: string) => {
    expect(world.wiki.filter((p) => p.startsWith("/images/")).sort()).toEqual(
      quoted(icons)
        .map((i) => `/images/Item_${i}.png`)
        .sort()
    );
  });
  // The refresh pauses between pages, so give it time to work through the bank.
  step(/^the wiki refresh has finished$/, () =>
    eventually(() => {
      const held = world.slots.filter(
        (s) => s.item && s.item.name !== "Empty" && !ITEMDB[s.itemId]?.nodrop
      );
      const icons = new Set(
        [
          ...held.map((s) => ITEMDB[s.itemId]?.icon),
          ...(held.length ? [world.wikiIcon] : []),
        ].filter(Boolean)
      );
      for (const icon of icons)
        expect(
          existsSync(path.join(world.dir, "cache/icons", `${icon}.png`))
        ).toBe(true);
    }, 10000).then(settle)
  );

  // ---------- bank requests ----------
  step(/^posting bank requests is set up$/, () => {
    world.env.token = "bot-token";
    world.env.bankRequestsChannelId = "requests-channel";
  });
  // The site reads its settings as it starts, so this one starts afresh. Sign-ins outlast it.
  step(/^the site restarts without the bot's token$/, () => {
    delete world.env.token;
    world.base = "";
  });
  step(/^Discord refuses posts$/, () => {
    world.postStatus = 403;
  });
  step(/^(\w+) posts the bank request:$/, (who: string, json: string) =>
    request(who, "/api/bank-request", { method: "POST", body: json })
  );
  const embeds = (n: number, description = "x") =>
    JSON.stringify({
      embeds: Array.from({ length: n }, (_, i) => ({
        title: `Embed ${i + 1}`,
        description,
        color: 0,
      })),
    });
  step(
    /^(\w+) posts a bank request of (\d+) embeds?$/,
    (who: string, n: string) =>
      request(who, "/api/bank-request", { method: "POST", body: embeds(+n) })
  );
  step(
    /^(\w+) posts a bank request with a (\d+)-character description$/,
    (who: string, n: string) =>
      request(who, "/api/bank-request", {
        method: "POST",
        body: embeds(1, "x".repeat(+n)),
      })
  );
  step(
    /^(\w+) posts a bank request of (\d+) embeds with (\d+)-character descriptions$/,
    (who: string, n: string, len: string) =>
      request(who, "/api/bank-request", {
        method: "POST",
        body: embeds(+n, "x".repeat(+len)),
      })
  );
  step(/^(\w+) posts a bank request that isn't JSON$/, (who: string) =>
    request(who, "/api/bank-request", { method: "POST", body: "not json" })
  );
  step(/^(\w+) posts (\d+) bank requests$/, async (who: string, n: string) => {
    world.answers = [];
    for (let i = 0; i < +n; i++)
      await request(who, "/api/bank-request", {
        method: "POST",
        body: embeds(1),
      });
  });
  step(
    /^the bot posts in #bank-requests:$/,
    (rows: Record<string, string>[]) => {
      expect(world.posts).toHaveLength(1);
      const [post] = world.posts;
      expect(post.auth).toBe("Bot bot-token");
      expect(post.body.allowed_mentions).toEqual({ parse: [] });
      expect(
        post.body.embeds.map((e) => ({
          title: e.title,
          url: e.url ?? "",
          description: e.description,
          footer: e.footer?.text ?? "",
          thumbnail: e.thumbnail?.url ?? "",
        }))
      ).toEqual(rows);
    }
  );
  step(/^the bot has posted (\d+) bank requests?$/, (n: string) =>
    expect(world.posts).toHaveLength(+n)
  );
  step(/^the bot posts nothing$/, () => expect(world.posts).toHaveLength(0));
  step(
    /^the bank says (\w+) is signed in as "(.*)"$/,
    (_: string, name: string) =>
      expect((JSON.parse(text()) as { me: unknown }).me).toEqual({ name })
  );

  // ---------- page errors ----------
  step(/^(\w+) reports a page error:$/, (who: string, json: string) =>
    request(who, "/api/errors", {
      method: "POST",
      body: json,
      headers: { "user-agent": "TestBrowser/1" },
    })
  );
  step(/^(\w+) reports a page error that isn't JSON$/, (who: string) =>
    request(who, "/api/errors", { method: "POST", body: "not json" })
  );
  // "From the current page" reports carry the commit the site is running, as a freshly loaded page's do.
  step(
    /^(\w+) reports a page error( from the current page)? with a (\d+)-character message$/,
    (who: string, current: string | undefined, n: string) =>
      request(who, "/api/errors", {
        method: "POST",
        body: JSON.stringify({
          message: "x".repeat(+n),
          rev: current ? world.env.SOURCE_REV : undefined,
        }),
      })
  );
  step(
    /^(\w+) reports (\d+) page errors from the current page$/,
    async (who: string, n: string) => {
      world.answers = [];
      for (let i = 0; i < +n; i++)
        await request(who, "/api/errors", {
          method: "POST",
          body: JSON.stringify({ rev: world.env.SOURCE_REV }),
        });
    }
  );
  step(/^an issue is filed titled "(.*)"$/, (title: string) =>
    eventually(() => reportOf(title))
  );
  step(/^(\d+) issues? (?:is|are) filed$/, async (n: string) => {
    await settle();
    expect(world.issues).toHaveLength(+n);
  });
  step(/^no issue is filed$/, async () => {
    await settle();
    expect(world.issues).toEqual([]);
  });
  step(/^the issue "(.*)" says "(.*)"$/, (title: string, says: string) =>
    expect(reportOf(title).body).toContain(says)
  );
  step(/^the issue "(.*)" doesn't say "(.*)"$/, (title: string, says: string) =>
    expect(reportOf(title).body).not.toContain(says)
  );
  step(/^the issue filed quotes a message of (\d+) "x"s$/, (n: string) =>
    eventually(() =>
      expect(world.issues[world.issues.length - 1].body).toContain(
        `\n${"x".repeat(+n)}\n`
      )
    )
  );

  // ---------- the process ----------
  step(/^the web process's code is loaded$/, () => void load());
  step(/^nothing listens on that port$/, async () => {
    await expect(
      fetch(`http://127.0.0.1:${world.env.PORT}/healthz`)
    ).rejects.toThrow();
  });
  step(/^the web process (?:starts|has started)$/, async () => {
    const real = http.createServer;
    const create = jest.spyOn(http, "createServer").mockImplementation(((
      ...args: Parameters<typeof real>
    ) => {
      const s = real(...args);
      world.servers.push(s);
      return s;
    }) as typeof real);
    const every = jest.spyOn(global, "setInterval").mockImplementation(((
      _: unknown,
      ms?: number
    ) => {
      world.every.push(ms ?? 0);
      return 0;
    }) as unknown as typeof setInterval);
    const on = jest.spyOn(process, "on").mockImplementation(((
      event: string,
      fn: (err: unknown) => void
    ) => {
      world.handlers[event] = fn;
      return process;
    }) as typeof process.on);
    try {
      load().start();
    } finally {
      [create, every, on].forEach((s) => s.mockRestore());
    }
    world.base = `http://127.0.0.1:${world.env.PORT}`;
    await eventually(() =>
      expect(
        world.logs.some((l) =>
          l.includes(`bank web: listening on ${world.env.PORT}`)
        )
      ).toBe(true)
    );
  });
  step(/^the wiki is refreshed again every (\d+) minutes$/, (min: string) =>
    expect(world.every).toEqual([+min * 60e3])
  );
  step(
    /^a promise fails with (an error|the bare value) "(.*)" and nothing catches it$/,
    (how: string, msg: string) => {
      exits = world.exits;
      world.handlers.unhandledRejection(
        how === "an error" ? new Error(msg) : msg
      );
    }
  );
  step(/^the web process hits an uncaught error "(.*)"$/, (msg: string) => {
    exits = world.exits;
    world.handlers.uncaughtException(new Error(msg));
  });
  step(/^the web process exits with code (\d+)$/, (code: string) =>
    eventually(() => expect(world.exits).toEqual([+code]))
  );
  step(/^the web process keeps running$/, async () => {
    await settle();
    expect(world.exits).toEqual([]);
  });
};
