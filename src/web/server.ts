// The bank browser's web process: serves the page and the live bank to Castle members, who sign
// in with Discord. It runs apart from the bot (Procfile `web`), so a crash here never takes the
// Discord worker down with it.
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { createServer, IncomingMessage, ServerResponse } from "http";
import path from "path";
import { reportError } from "../shared/error-reports";
import { log } from "../shared/logger";
import { Auth, Session } from "./auth";
import { BankApi } from "./bank-api";
import { PageMap } from "./page-map";
import { message, send } from "./respond";
import { WikiCache } from "./wiki-cache";

dotenv.config();

const {
  PORT = "5000",
  NODE_ENV,
  clientId,
  guildId,
  discordClientSecret,
  bankWebRoleId,
  bankWebSessionSecret,
  bankWebUrl = `http://localhost:${PORT}`,
  bankWebDevNoAuth,
  bankCacheDir,
  GIT_REV = "",
} = process.env;

const ROOT = path.resolve(__dirname, "../..");
const DIST = path.join(ROOT, "bank/dist");
const PAGE = path.join(DIST, "index.html");
const WIKI_EVERY = 30 * 60e3;

const auth =
  clientId && guildId && discordClientSecret && bankWebRoleId && bankWebSessionSecret
    ? new Auth({ clientId, guildId, clientSecret: discordClientSecret, roleId: bankWebRoleId, secret: bankWebSessionSecret, baseUrl: bankWebUrl })
    : null;
// Only for running the page locally against a dev database, and never once sign-in is set up.
const NO_AUTH = bankWebDevNoAuth === "true" && NODE_ENV !== "production" && !auth;
// Missing settings show a notice rather than crashing, so a half-configured web process can't fail a deploy.
if (!auth && !NO_AUTH) log("bank web: set clientId, guildId, discordClientSecret, bankWebRoleId and bankWebSessionSecret to open the bank");

const wiki = new WikiCache(bankCacheDir || path.join(ROOT, "bank/cache"));
const api = new BankApi(path.join(ROOT, "bank/data"), wiki);

let page: Buffer | null = null;
// The page reports its errors with this commit, so they're mapped with the right source map.
const readPage = () => (page ??= Buffer.from(readFileSync(PAGE, "utf-8").replace("__BANK_REV__", GIT_REV)));
const pageMap = new PageMap(DIST);
const PAGE_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'",
};

function session(req: IncomingMessage): Session | null {
  return NO_AUTH ? { id: "dev", name: "dev", exp: Infinity } : auth?.session(req) ?? null;
}

// Errors from the page, filed for fixing. Members only, small, and not too many from one person.
const ERRORS_PER_MINUTE = 10;
const errorCounts = new Map<string, number[]>();
async function pageError(req: IncomingMessage, res: ServerResponse, me: Session) {
  const recent = (errorCounts.get(me.id) || []).filter(t => Date.now() - t < 60e3);
  if (recent.length >= ERRORS_PER_MINUTE) return send(req, res, 429, "text/plain", "Too many");
  errorCounts.set(me.id, [...recent, Date.now()]);
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16384) return send(req, res, 413, "text/plain", "Too large");
  }
  let e: { message?: unknown; stack?: unknown; componentStack?: unknown; rev?: unknown };
  try {
    e = JSON.parse(raw);
  } catch {
    return send(req, res, 400, "text/plain", "Bad report");
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const current = !!GIT_REV && str(e.rev) === GIT_REV;
  const stack = [str(e.stack), str(e.componentStack) && "Component stack:" + str(e.componentStack)].filter(Boolean).join("\n");
  reportError({
    source: "page",
    message: str(e.message).slice(0, 500) || "(no message)",
    stack: current ? pageMap.map(stack) : pageMap.strip(stack) + "\n(from a page loaded before the last deploy, so positions aren't mapped to source)",
    details: { Browser: str(req.headers["user-agent"]).slice(0, 200) },
  });
  send(req, res, 204, "text/plain", "");
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", bankWebUrl);
  if (req.method === "POST" && url.pathname === "/api/errors") {
    const me = session(req);
    return me ? pageError(req, res, me) : send(req, res, 401, "text/plain", "Sign in");
  }
  if (req.method !== "GET" && req.method !== "HEAD") return send(req, res, 405, "text/plain", "Method not allowed");
  if (url.pathname === "/healthz") return send(req, res, 200, "text/plain", "ok");

  // Icons are the wiki's own public images, so they need no sign-in and cache for a week.
  const icon = url.pathname.match(/^\/icons\/(\d+)\.png$/);
  if (icon) {
    const p = wiki.iconPath(+icon[1]);
    return p ? send(req, res, 200, "image/png", readFileSync(p), { "Cache-Control": "public, max-age=604800" }) : send(req, res, 404, "text/plain", "Not found");
  }

  if (!auth && !NO_AUTH) return message(req, res, 503, "Not open yet", "The guild bank site isn't set up yet.", false);
  if (auth) {
    switch (url.pathname) {
      case "/auth/login":
        return auth.login(res);
      case "/auth/callback":
        return auth.callback(req, res, url);
      case "/auth/logout":
        return auth.logout(res);
      case "/signed-out":
        return message(req, res, 200, "Signed out", "You're signed out of the guild bank.");
    }
  }

  const me = session(req);
  if (url.pathname === "/api/bank") {
    if (!me) return send(req, res, 401, "application/json", JSON.stringify({ error: "sign in" }));
    return send(req, res, 200, "application/json", JSON.stringify(await api.bank()));
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    if (!me) return auth!.login(res);
    return send(req, res, 200, "text/html; charset=utf-8", readPage(), PAGE_HEADERS);
  }
  send(req, res, 404, "text/plain", "Not found");
}

createServer((req, res) => {
  handle(req, res).catch(err => {
    reportError({ source: "web", message: String(err?.message || err), stack: err?.stack, details: { Path: (req.url || "").split("?")[0] } });
    if (!res.headersSent) send(req, res, 500, "text/plain", "Something went wrong");
    else res.end();
  });
}).listen(+PORT, () => log(`bank web: listening on ${PORT} as ${bankWebUrl}${NO_AUTH ? " (no auth)" : ""}`));

// Keep icons and auctions current in the background; the page never waits on the wiki.
const refreshWiki = () => api.refreshWiki().catch(err => reportError({ source: "web", message: `wiki refresh failed: ${err?.message || err}`, stack: err?.stack }));
refreshWiki();
setInterval(refreshWiki, WIKI_EVERY);

process.on("unhandledRejection", (err: any) => reportError({ source: "web", message: String(err?.message || err), stack: err?.stack }));
process.on("uncaughtException", err => {
  // Report, then exit as Node would have; Dokku starts the process again.
  const exit = () => process.exit(1);
  setTimeout(exit, 5000).unref();
  reportError({ source: "web", message: err.message, stack: err.stack }).finally(exit);
});
