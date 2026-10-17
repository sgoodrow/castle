import { mkdtempSync, writeFileSync } from "fs";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";

// The server reads its settings and builds its helpers on import, so each test loads a fresh copy
// with the environment it needs. The helpers are stand-ins; each has its own tests.
jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("../shared/logger", () => ({ log: jest.fn() }));

const mockReportError = jest.fn((_r: unknown) => Promise.resolve());
jest.mock("../shared/error-reports", () => ({ reportError: (r: unknown) => mockReportError(r) }));

// A request is signed in when it carries `cookie: member=<id>`.
const mockAuth = {
  session: jest.fn((req: IncomingMessage) => {
    const id = /member=(\w+)/.exec(req.headers.cookie || "")?.[1];
    return id ? { id, name: id, exp: Infinity } : null;
  }),
  login: jest.fn((res: ServerResponse) => res.writeHead(302, { Location: "https://discord.example/authorize" }).end()),
  callback: jest.fn(async (_req: IncomingMessage, res: ServerResponse, url: URL) => {
    res.writeHead(302, { Location: `/?code=${url.searchParams.get("code")}` }).end();
  }),
  logout: jest.fn((res: ServerResponse) => res.writeHead(302, { Location: "/signed-out" }).end()),
};
const mockAuthConfig = jest.fn();
jest.mock("./auth", () => ({
  Auth: jest.fn().mockImplementation(c => {
    mockAuthConfig(c);
    return mockAuth;
  }),
}));

const mockBank = jest.fn();
const mockRefreshWiki = jest.fn();
jest.mock("./bank-api", () => ({ BankApi: jest.fn().mockImplementation(() => ({ bank: () => mockBank(), refreshWiki: () => mockRefreshWiki() })) }));

const mockIconPath = jest.fn();
jest.mock("./wiki-cache", () => ({ WikiCache: jest.fn().mockImplementation(() => ({ iconPath: (n: number) => mockIconPath(n) })) }));

const mockMap = jest.fn((s: string) => `mapped:${s}`);
const mockStrip = jest.fn((s: string) => `stripped:${s}`);
jest.mock("./page-map", () => ({ PageMap: jest.fn().mockImplementation(() => ({ map: mockMap, strip: mockStrip })) }));

// The built page may not exist (CI doesn't build it), so serve a small one in its place.
const PAGE = "<!doctype html><title>Bank</title><script>rev='__BANK_REV__'</script>";
jest.mock("fs", () => {
  const fs = jest.requireActual("fs");
  return {
    ...fs,
    readFileSync: jest.fn((p: string, ...rest: unknown[]) => (String(p).endsWith(path.join("bank", "dist", "index.html")) ? PAGE : fs.readFileSync(p, ...rest))),
  };
});

const SIGN_IN = {
  clientId: "client-id",
  guildId: "guild-id",
  discordClientSecret: "client-secret",
  bankWebRoleId: "bank-role",
  bankWebSessionSecret: "session-secret",
  bankWebUrl: "https://bank.example.com",
};
const SETTINGS = ["NODE_ENV", "GIT_REV", "bankWebDevNoAuth", "bankCacheDir", "PORT", ...Object.keys(SIGN_IN)];
const savedEnv = { ...process.env };

let server: Server | undefined;
let base = "";

// Load the server with these settings and start it on a free port.
async function load(env: Record<string, string>) {
  for (const k of SETTINGS) delete process.env[k];
  Object.assign(process.env, { NODE_ENV: "test" }, env);
  let mod!: typeof import("./server");
  jest.isolateModules(() => {
    mod = require("./server");
  });
  server = createServer(mod.handle);
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return mod;
}

const get = (p: string, init: RequestInit = {}) => fetch(base + p, { redirect: "manual", ...init });
const member = (id = "alice") => ({ headers: { cookie: `member=${id}` } });

beforeEach(() => {
  jest.clearAllMocks();
  mockBank.mockResolvedValue({ chars: [] });
  mockIconPath.mockReturnValue(null);
});

afterEach(async () => {
  if (server) await new Promise(resolve => server!.close(resolve));
  server = undefined;
});

afterAll(() => {
  process.env = savedEnv;
});

describe("with sign-in set up", () => {
  beforeEach(() => load({ ...SIGN_IN, GIT_REV: "abc123" }));

  test("builds Auth from the settings", () => {
    expect(mockAuthConfig).toHaveBeenCalledWith({
      clientId: "client-id",
      guildId: "guild-id",
      clientSecret: "client-secret",
      roleId: "bank-role",
      secret: "session-secret",
      baseUrl: "https://bank.example.com",
    });
  });

  test("/healthz answers without sign-in", async () => {
    const res = await get("/healthz");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  test("other methods are refused", async () => {
    const res = await get("/api/bank", { method: "PUT", ...member() });
    expect(res.status).toBe(405);
  });

  describe("auth gate", () => {
    test("the page sends visitors who aren't signed in to Discord", async () => {
      for (const p of ["/", "/index.html"]) {
        const res = await get(p);
        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("https://discord.example/authorize");
      }
    });

    test("/api/bank refuses visitors who aren't signed in", async () => {
      const res = await get("/api/bank");
      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toBe("application/json");
      expect(await res.json()).toEqual({ error: "sign in" });
      expect(mockBank).not.toHaveBeenCalled();
    });

    test("routes /auth/* to Auth", async () => {
      expect((await get("/auth/login")).headers.get("location")).toBe("https://discord.example/authorize");
      expect((await get("/auth/callback?code=xyz")).headers.get("location")).toBe("/?code=xyz");
      expect(mockAuth.callback.mock.calls[0][2].href).toBe("https://bank.example.com/auth/callback?code=xyz");
      expect((await get("/auth/logout")).headers.get("location")).toBe("/signed-out");
    });

    test("/signed-out says so and offers to sign in again", async () => {
      const res = await get("/signed-out");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("You're signed out of the guild bank.");
      expect(html).toContain('href="/auth/login"');
    });
  });

  describe("/api/bank", () => {
    test("returns the bank to members", async () => {
      mockBank.mockResolvedValue({ chars: [{ name: "Banker" }] });
      const res = await get("/api/bank", member());
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await res.json()).toEqual({ chars: [{ name: "Banker" }] });
    });

    test("HEAD sends headers only", async () => {
      const res = await get("/api/bank", { method: "HEAD", ...member() });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("");
    });
  });

  describe("the page", () => {
    test("is served to members with this commit and a CSP", async () => {
      const res = await get("/", member());
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(await res.text()).toBe(PAGE.replace("__BANK_REV__", "abc123"));
    });

    test("is read from disk once", async () => {
      const { readFileSync } = jest.requireMock("fs");
      await get("/", member());
      await get("/index.html", member());
      expect(readFileSync.mock.calls.filter(([p]: [string]) => p.endsWith("index.html"))).toHaveLength(1);
    });
  });

  describe("icons", () => {
    test("are served without sign-in and cached for a week", async () => {
      const dir = mkdtempSync(path.join(os.tmpdir(), "bank-icons-"));
      const png = path.join(dir, "500.png");
      writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      mockIconPath.mockReturnValue(png);
      const res = await get("/icons/500.png");
      expect(mockIconPath).toHaveBeenCalledWith(500);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("cache-control")).toBe("public, max-age=604800");
      expect(Buffer.from(await res.arrayBuffer())).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    });

    test("that aren't cached are not found", async () => {
      expect((await get("/icons/501.png")).status).toBe(404);
    });

    test("only take numeric names", async () => {
      expect((await get("/icons/..%2F..%2Fsecret.png", member())).status).toBe(404);
      expect(mockIconPath).not.toHaveBeenCalled();
    });
  });

  test("unknown paths are not found", async () => {
    const res = await get("/nope", member());
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not found");
  });

  describe("error paths", () => {
    test("a failing route is reported and answered with a 500", async () => {
      mockBank.mockRejectedValue(new Error("db down"));
      const res = await get("/api/bank?q=secret", member());
      expect(res.status).toBe(500);
      expect(await res.text()).toBe("Something went wrong");
      expect(mockReportError).toHaveBeenCalledWith(expect.objectContaining({ source: "web", message: "db down", details: { Path: "/api/bank" } }));
    });

    test("a failure after the response started ends it", async () => {
      mockAuth.callback.mockImplementationOnce(async (_req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.write("partial");
        throw "late";
      });
      const res = await get("/auth/callback");
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("partial");
      expect(mockReportError).toHaveBeenCalledWith(expect.objectContaining({ source: "web", message: "late" }));
    });
  });

  describe("POST /api/errors", () => {
    const post = (body: string, id = "alice") => get("/api/errors", { method: "POST", body, headers: { cookie: `member=${id}`, "user-agent": "TestBrowser/1" } });

    test("needs sign-in", async () => {
      const res = await get("/api/errors", { method: "POST", body: "{}" });
      expect(res.status).toBe(401);
      expect(mockReportError).not.toHaveBeenCalled();
    });

    test("files errors from the current page with mapped positions", async () => {
      const res = await post(JSON.stringify({ message: "boom", stack: "at x (https://bank/:1:2)", componentStack: "\n in App", rev: "abc123" }));
      expect(res.status).toBe(204);
      expect(mockMap).toHaveBeenCalledWith("at x (https://bank/:1:2)\nComponent stack:\n in App");
      expect(mockReportError).toHaveBeenCalledWith({
        source: "page",
        message: "boom",
        stack: "mapped:at x (https://bank/:1:2)\nComponent stack:\n in App",
        details: { Browser: "TestBrowser/1" },
      });
    });

    test("strips positions from pages loaded before the last deploy", async () => {
      await post(JSON.stringify({ message: "old", stack: "at y", rev: "older" }));
      expect(mockMap).not.toHaveBeenCalled();
      expect(mockReportError.mock.calls[0][0]).toMatchObject({ stack: expect.stringMatching(/^stripped:at y\n\(from a page loaded before the last deploy/) });
    });

    test("tolerates reports with missing or odd fields", async () => {
      await post(JSON.stringify({ message: 42, stack: ["no"] }));
      expect(mockReportError.mock.calls[0][0]).toMatchObject({ message: "(no message)" });
    });

    test("truncates long messages", async () => {
      await post(JSON.stringify({ message: "x".repeat(1000) }));
      expect((mockReportError.mock.calls[0][0] as { message: string }).message).toHaveLength(500);
    });

    test("refuses reports that aren't JSON", async () => {
      const res = await post("not json");
      expect(res.status).toBe(400);
      expect(mockReportError).not.toHaveBeenCalled();
    });

    test("refuses reports that are too large", async () => {
      const res = await post(JSON.stringify({ message: "x".repeat(20000) }));
      expect(res.status).toBe(413);
      expect(mockReportError).not.toHaveBeenCalled();
    });

    test("limits each member to 10 a minute", async () => {
      for (let i = 0; i < 10; i++) expect((await post("{}")).status).toBe(204);
      expect((await post("{}")).status).toBe(429);
      expect((await post("{}", "bob")).status).toBe(204);
      expect(mockReportError).toHaveBeenCalledTimes(11);
    });
  });
});

describe("without sign-in set up", () => {
  test("shows a notice instead of the bank", async () => {
    await load({});
    for (const p of ["/", "/api/bank", "/auth/login"]) {
      const res = await get(p, member());
      expect(res.status).toBe(503);
      expect(await res.text()).toContain("The guild bank site isn't set up yet.");
    }
    expect(mockBank).not.toHaveBeenCalled();
  });

  test("still serves health checks and icons", async () => {
    await load({});
    expect((await get("/healthz")).status).toBe(200);
    expect((await get("/icons/1.png")).status).toBe(404);
  });

  test("errors from the page can't be filed", async () => {
    await load({});
    expect((await get("/api/errors", { method: "POST", body: "{}", ...member() })).status).toBe(401);
  });
});

describe("dev mode without auth", () => {
  test("opens the bank to everyone", async () => {
    await load({ bankWebDevNoAuth: "true" });
    expect((await get("/api/bank")).status).toBe(200);
    expect((await get("/")).status).toBe(200);
    expect((await get("/auth/login")).status).toBe(404); // no sign-in routes
    expect((await get("/api/errors", { method: "POST", body: "{}" })).status).toBe(204);
  });

  test("is never on in production", async () => {
    await load({ bankWebDevNoAuth: "true", NODE_ENV: "production" });
    expect((await get("/api/bank")).status).toBe(503);
  });

  test("is never on once sign-in is set up", async () => {
    await load({ ...SIGN_IN, bankWebDevNoAuth: "true" });
    expect((await get("/api/bank")).status).toBe(401);
  });
});

describe("start", () => {
  test("isn't called on import", async () => {
    const listen = jest.spyOn(Server.prototype, "listen");
    await load({});
    expect(listen).toHaveBeenCalledTimes(1); // only this test's own server
    listen.mockRestore();
  });

  test("listens, refreshes the wiki and reports what would crash the process", async () => {
    const { start } = await load({ PORT: "5123" });
    const listen = jest.spyOn(Server.prototype, "listen").mockImplementation(function (this: Server, ...args: unknown[]) {
      (args.find(a => typeof a === "function") as () => void)();
      return this;
    });
    const every = jest.spyOn(global, "setInterval").mockReturnValue(0 as unknown as NodeJS.Timeout);
    const handlers: Record<string, (err: unknown) => void> = {};
    const on = jest.spyOn(process, "on").mockImplementation(((event: string, fn: (err: unknown) => void) => {
      handlers[event] = fn;
      return process;
    }) as typeof process.on);
    const exit = jest.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);
    mockRefreshWiki.mockRejectedValue(new Error("wiki down"));
    try {
      start();
      expect(listen).toHaveBeenCalledWith(5123, expect.any(Function));
      expect(mockRefreshWiki).toHaveBeenCalledTimes(1);
      expect(every).toHaveBeenCalledWith(expect.any(Function), 30 * 60e3);
      await new Promise(setImmediate);
      expect(mockReportError).toHaveBeenCalledWith(expect.objectContaining({ source: "web", message: "wiki refresh failed: wiki down" }));

      handlers.unhandledRejection(new Error("lost promise"));
      expect(mockReportError).toHaveBeenLastCalledWith(expect.objectContaining({ message: "lost promise" }));

      handlers.uncaughtException(new Error("crash"));
      expect(mockReportError).toHaveBeenLastCalledWith(expect.objectContaining({ message: "crash" }));
      await new Promise(setImmediate);
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      [listen, every, on, exit].forEach(s => s.mockRestore());
    }
  });
});
