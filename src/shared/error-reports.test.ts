import { commit, describeError, fingerprint, remember, reportError, stopping } from "./error-reports";

vi.mock("./logger", () => ({ log: vi.fn() }));

const calls: { url: string; method: string; body: any }[] = [];
let searchHits: number[] = [];
const said = { feature: "a test", outcome: "Nothing." };

beforeEach(() => {
  calls.length = 0;
  searchHits = [];
  process.env.githubErrorToken = "ghp_testtoken1234";
  process.env.GIT_REV = "abc123";
  global.fetch = vi.fn(async (url: string, init: any) => {
    calls.push({ url, method: init.method, body: init.body && JSON.parse(init.body) });
    const json = url.includes("/search/") ? { items: searchHits.map(number => ({ number })) } : { number: 42 };
    return { ok: true, status: 200, json: async () => json } as Response;
  }) as any;
});

describe("fingerprint", () => {
  it("ignores line numbers and values that change", () => {
    const a = { source: "page" as const, message: "Cannot read 'x' of 3", stack: "TypeError\n    at f (bank/web/src/data.ts:174:64)" };
    const b = { source: "page" as const, message: "Cannot read 'y' of 7", stack: "TypeError\n    at f (bank/web/src/data.ts:180:2)" };
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it("tells different places apart", () => {
    const a = { source: "page" as const, message: "boom", stack: "at f (bank/web/src/data.ts:1:1)" };
    expect(fingerprint(a)).not.toBe(fingerprint({ ...a, stack: "at g (bank/web/src/tab.ts:1:1)" }));
    expect(fingerprint(a)).not.toBe(fingerprint({ ...a, source: "web" }));
  });
});

describe("commit", () => {
  afterEach(() => delete process.env.SOURCE_REV);

  it("prefers the commit baked into the image over Dokku's GIT_REV", () => {
    process.env.SOURCE_REV = "def456";
    expect(commit()).toBe("def456");
  });

  it("falls back to GIT_REV for a git push deploy", () => {
    expect(commit()).toBe("abc123");
  });
});

describe("reportError", () => {
  it("only logs without a token", async () => {
    delete process.env.githubErrorToken;
    await reportError({ source: "web", message: "no token here", ...said });
    expect(calls).toHaveLength(0);
  });

  it("files one labelled issue for a burst of the same error", async () => {
    const r = { source: "web" as const, message: "burst", stack: "at f (src/web/x.ts:1:1)", ...said };
    await Promise.all([reportError(r), reportError(r), reportError(r)]);
    const created = calls.filter(c => c.method === "POST" && c.url.endsWith("/repos/sgoodrow/castle/issues"));
    expect(created).toHaveLength(1);
    expect(created[0].body.labels).toEqual(["error"]);
    expect(created[0].body.title).toBe("[web] burst");
    expect(created[0].body.body).toContain("**Commit:** abc123");
    expect(created[0].body.body).toMatch(/<!-- error-fingerprint:[0-9a-f]{12} -->/);
  });

  it("comments on an open issue for the same error instead of opening another", async () => {
    searchHits = [7];
    await reportError({ source: "worker", message: "already filed", stack: "at f (src/a.ts:1:1)", ...said });
    expect(calls.map(c => `${c.method} ${c.url.replace(/\?.*/, "")}`)).toEqual([
      "GET https://api.github.com/search/issues",
      "POST https://api.github.com/repos/sgoodrow/castle/issues/7/comments",
    ]);
  });

  it("keeps secrets and URL passwords out of the issue", async () => {
    process.env.DATABASE_URL = "postgres://castle:hunter22@db:5432/castle";
    await reportError({ source: "web", message: "connect failed", stack: "Error: postgres://castle:hunter22@db:5432/castle token ghp_testtoken1234\n at f (src/web/q.ts:1:1)", ...said });
    const text = JSON.stringify(calls);
    expect(text).not.toContain("hunter22");
    expect(text).not.toContain("ghp_testtoken1234");
  });
});

describe("what an issue says", () => {
  const filed = () => calls.find(c => c.method === "POST" && c.url.endsWith("/repos/sgoodrow/castle/issues"))!.body.body as string;

  it("says what was being done, what the person saw and where it ran", async () => {
    await reportError({ source: "worker", message: "said what", stack: "at f (src/s.ts:1:1)", feature: "/bot request", outcome: "Discord said the app didn't respond." });
    expect(filed()).toContain("**Feature:** /bot request");
    expect(filed()).toContain("**What they saw:** Discord said the app didn't respond.");
    expect(filed()).toMatch(/\*\*Instance:\*\* .+, up \d+[smh]/);
  });

  it("keeps what happened just before, which an escaped error loses", async () => {
    remember("/bot request failed 3400ms after the member acted (deferred: false, replied: false): DiscordAPIError[10062]: Unknown interaction");
    stopping("SIGTERM");
    await reportError({ source: "worker", message: "trail", stack: "at f (src/t.ts:1:1)", feature: "unknown", outcome: "The bot crashed." });
    expect(filed()).toMatch(/\d+\.\ds earlier: \/bot request failed 3400ms .* DiscordAPIError\[10062\]: Unknown interaction/);
    expect(filed()).toMatch(/earlier: received SIGTERM: this instance is stopping/);
    expect(filed()).toMatch(/\*\*Instance:\*\* .*, stopping \(signalled \d+\.\ds earlier\)/);
  });

  it("says which features and errors a repeat was, in its periodic comment", async () => {
    const now = Date.now();
    const spy = vi.spyOn(Date, "now").mockReturnValue(now);
    const r = { source: "worker" as const, message: "repeats", stack: "at f (src/r.ts:1:1)", outcome: "Nothing shown." };
    await reportError({ ...r, feature: "/bot request" });
    await reportError({ ...r, feature: "/bot request" });
    await reportError({ ...r, feature: "/odkp" });
    spy.mockReturnValue(now + 7 * 3600e3);
    await reportError({ ...r, feature: "/bot request" });
    spy.mockRestore();
    const comment = calls.filter(c => c.url.endsWith("/issues/42/comments")).pop()!.body.body as string;
    expect(comment).toMatch(/^Happened 3 more times/);
    expect(comment).toContain("- /bot request — repeats ×2");
    expect(comment).toContain("- /odkp — repeats ×1");
  });

  it("describes an error with its kind, HTTP status and causes", () => {
    const api = Object.assign(new Error("Unknown interaction"), { name: "DiscordAPIError[10062]", status: 404 });
    expect(describeError(api).message).toBe("DiscordAPIError[10062]: Unknown interaction (HTTP 404)");
    const wrapped = new Error("couldn't post", { cause: new TypeError("fetch failed") });
    expect(describeError(wrapped).message).toBe("couldn't post");
    expect(describeError(wrapped).stack).toMatch(/Caused by: TypeError: fetch failed/);
    expect(describeError("a bare string")).toEqual({ message: "a bare string" });
  });

  it("finds our frame in built code too, so different crashes don't share an issue", () => {
    const at = (file: string) => ({ source: "worker" as const, message: "same", stack: `Error\n    at f (/app/node_modules/discord.js/src/x.js:1:1)\n    at g (/app/dist/${file}:1:1)`, feature: "f", outcome: "o" });
    expect(fingerprint(at("listeners/a.js"))).not.toBe(fingerprint(at("features/b.js")));
  });
});
