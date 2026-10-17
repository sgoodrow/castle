// The bank browser's web process: serves the page and the live bank to Castle members, who sign
// in with Discord. It runs apart from the bot (Procfile `web`), so a crash here never takes the
// Discord worker down with it.
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { createServer, IncomingMessage, ServerResponse } from "http";
import path from "path";
import { log } from "../shared/logger";
import { Auth, Session } from "./auth";
import { BankApi } from "./bank-api";
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
} = process.env;

const ROOT = path.resolve(__dirname, "../..");
const PAGE = path.join(ROOT, "bank/dist/index.html");
const WIKI_EVERY = 30 * 60e3;

// Only for running the page locally against a dev database.
const NO_AUTH = bankWebDevNoAuth === "true" && NODE_ENV !== "production";
const auth =
  clientId && guildId && discordClientSecret && bankWebRoleId && bankWebSessionSecret
    ? new Auth({ clientId, guildId, clientSecret: discordClientSecret, roleId: bankWebRoleId, secret: bankWebSessionSecret, baseUrl: bankWebUrl })
    : null;
// Missing settings show a notice rather than crashing, so a half-configured web process can't fail a deploy.
if (!auth && !NO_AUTH) log("bank web: set clientId, guildId, discordClientSecret, bankWebRoleId and bankWebSessionSecret to open the bank");

const wiki = new WikiCache(bankCacheDir || path.join(ROOT, "bank/cache"));
const api = new BankApi(path.join(ROOT, "bank/data"), wiki);

let page: Buffer | null = null;
const readPage = () => (page ??= readFileSync(PAGE));
const PAGE_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'",
};

function session(req: IncomingMessage): Session | null {
  return NO_AUTH ? { id: "dev", name: "dev", exp: Infinity } : auth?.session(req) ?? null;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", bankWebUrl);
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
    log(`bank web: ${req.url} failed: ${err?.stack || err}`);
    if (!res.headersSent) send(req, res, 500, "text/plain", "Something went wrong");
    else res.end();
  });
}).listen(+PORT, () => log(`bank web: listening on ${PORT} as ${bankWebUrl}${NO_AUTH ? " (no auth)" : ""}`));

// Keep icons and auctions current in the background; the page never waits on the wiki.
const refreshWiki = () => api.refreshWiki().catch(err => log(`bank web: wiki refresh failed: ${err}`));
refreshWiki();
setInterval(refreshWiki, WIKI_EVERY);
