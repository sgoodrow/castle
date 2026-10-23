// The bank browser's web process: serves the page and the live bank to Castle members, who sign
// in with Discord. It runs apart from the bot (Procfile `web`), so a crash here never takes the
// Discord worker down with it.
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { createServer, IncomingMessage, ServerResponse } from "http";
import path from "path";
import { commit, describeError, reportError } from "../shared/error-reports";
import { log } from "../shared/logger";
import { Auth, Session } from "./auth";
import { BankApi } from "./bank-api";
import { postRequest, postToChannel, readPost, type Poster } from "./bank-post";
import { PageMap } from "./page-map";
import { message, send } from "./respond";
import { WikiCache } from "./wiki-cache";
import { SpellSheet } from "./spell-sheet";
import { SkySheet } from "./sky-sheet";
import { ResearchSheet } from "./research-sheet";
import { JewelrySheet } from "./jewelry-sheet";
import { SheetAlert } from "./sheet-alert";

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
  bankDistDir,
  token,
  bankRequestsChannelId,
  jewelryChannelId,
  bankOfficeChannelId,
  bankSheetAlerts,
} = process.env;

const GIT_REV = commit();
const ROOT = path.resolve(__dirname, "../..");
const DIST = bankDistDir
  ? path.resolve(bankDistDir)
  : path.join(ROOT, "bank/dist");
const PAGE = path.join(DIST, "index.html");
const WIKI_EVERY = 30 * 60e3;

const auth =
  clientId &&
  guildId &&
  discordClientSecret &&
  bankWebRoleId &&
  bankWebSessionSecret
    ? new Auth({
        clientId,
        guildId,
        clientSecret: discordClientSecret,
        roleId: bankWebRoleId,
        secret: bankWebSessionSecret,
        baseUrl: bankWebUrl,
      })
    : null;
// Only for running the page locally against a dev database, and never once sign-in is set up.
const NO_AUTH =
  bankWebDevNoAuth === "true" && NODE_ENV !== "production" && !auth;
// Missing settings show a notice rather than crashing, so a half-configured web process can't fail a deploy.
if (!auth && !NO_AUTH)
  log(
    "bank web: set clientId, guildId, discordClientSecret, bankWebRoleId and bankWebSessionSecret to open the bank"
  );

const CACHE = bankCacheDir || path.join(ROOT, "bank/cache");
const wiki = new WikiCache(CACHE);
// Bankers hear in the bank office when a bank sheet breaks or reads again. Until bankSheetAlerts is
// "on", or without the bot's token and the channel, the post fails: nothing is recorded as told, so
// the alert goes out once alerts are on. The problems still log in the meantime.
const bankOffice = (text: string) =>
  token && bankOfficeChannelId && bankSheetAlerts === "on"
    ? postToChannel(token, bankOfficeChannelId, text)
    : Promise.reject(
        new Error(
          "bank sheet alerts are off, or the token or channel isn't set"
        )
      );
const alert = (file: string, sheet: string) =>
  new SheetAlert(path.join(CACHE, file), sheet, bankOffice);
const api = new BankApi(
  path.join(ROOT, "bank/data"),
  wiki,
  new SpellSheet(CACHE, alert("spell-sheet.alert", "The spell sheet")),
  new SkySheet(CACHE, alert("sky-sheet.alert", "The Plane of Sky sheet")),
  new ResearchSheet(CACHE, alert("research-sheet.alert", "The research sheet")),
  new JewelrySheet(CACHE, alert("jewelry-sheet.alert", "The jewelry sheet"))
);
// Posting needs the bot's token and the channel; without them the page is told so. Bank requests
// post to their channel, and made-to-order jewelry to the jewelers' channel.
const posterFor = (channelId: string | undefined): Poster | null =>
  token && channelId
    ? {
        token,
        channelId,
        baseUrl: bankWebUrl,
        icon: (id) => wiki.get(id)?.icon,
      }
    : null;
const poster = posterFor(bankRequestsChannelId);
const jewelryPoster = posterFor(jewelryChannelId);
if (token && bankRequestsChannelId && !jewelryChannelId)
  log(
    "bank web: jewelry requests can't be posted: the jewelry requests channel isn't set"
  );

let page: Buffer | null = null;
// The page reports its errors with this commit, so they're mapped with the right source map.
const readPage = () =>
  (page ??= Buffer.from(
    readFileSync(PAGE, "utf-8").replace("__BANK_REV__", GIT_REV)
  ));
const pageMap = new PageMap(DIST);
const PAGE_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'none'",
};

function session(req: IncomingMessage): Session | null {
  return NO_AUTH
    ? { id: "dev", name: "dev", exp: Infinity }
    : (auth?.session(req) ?? null);
}

// At most `n` in `ms` from each member. True if this one is allowed, and counts it.
function limiter(n: number, ms: number) {
  const times = new Map<string, number[]>();
  return (who: string) => {
    const recent = (times.get(who) || []).filter((t) => Date.now() - t < ms);
    if (recent.length >= n) return false;
    times.set(who, [...recent, Date.now()]);
    return true;
  };
}

// The request body, or null once it passes `max` characters.
async function body(req: IncomingMessage, max: number) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > max) return null;
  }
  return raw;
}

// Errors from the page, filed for fixing. Members only, small, and not too many from one person.
const errorAllowed = limiter(10, 60e3);
async function pageError(
  req: IncomingMessage,
  res: ServerResponse,
  me: Session
) {
  if (!errorAllowed(me.id))
    return send(req, res, 429, "text/plain", "Too many");
  const raw = await body(req, 16384);
  if (raw == null) return send(req, res, 413, "text/plain", "Too large");
  let e: {
    message?: unknown;
    stack?: unknown;
    componentStack?: unknown;
    rev?: unknown;
  };
  try {
    e = JSON.parse(raw);
  } catch {
    return send(req, res, 400, "text/plain", "Bad report");
  }
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const message = str(e.message).slice(0, 500) || "(no message)";
  const stack = [
    str(e.stack),
    str(e.componentStack) && "Component stack:" + str(e.componentStack),
  ]
    .filter(Boolean)
    .join("\n");
  // A page loaded before the last deploy runs old code, maybe with a bug that's since been fixed, and
  // its issue closed: filing it would open a new issue and fix run for nothing. Log it instead.
  if (GIT_REV && str(e.rev) !== GIT_REV) {
    log(
      `error (page, from ${
        str(e.rev).slice(0, 12) || "an unknown commit"
      }, not filed): ${message}\n${pageMap.strip(stack)}`
    );
  } else {
    reportError({
      source: "page",
      message,
      stack: pageMap.map(stack),
      feature: "the bank page",
      outcome: str(e.componentStack)
        ? "The page replaced itself with its error screen."
        : "Unknown: an error escaped the page's code; the page may have kept working.",
      details: { Browser: str(req.headers["user-agent"]).slice(0, 200) },
    });
  }
  send(req, res, 204, "text/plain", "");
}

// A member's tab, posted to #bank-requests. A few at a time, so a stuck button can't flood the channel.
const postAllowed = limiter(5, 10 * 60e3);
async function bankRequest(
  req: IncomingMessage,
  res: ServerResponse,
  me: Session
) {
  if (!postAllowed(me.id)) return send(req, res, 429, "text/plain", "Too many");
  const raw = await body(req, 65536);
  if (raw == null) return send(req, res, 413, "text/plain", "Too large");
  let parsed: { channel?: string; embeds?: unknown } | null;
  let post;
  try {
    parsed = JSON.parse(raw);
    post = readPost(parsed);
  } catch {
    parsed = null;
    post = null;
  }
  // Only the two channels, or no channel at all for an older page's bank request.
  const channel = parsed?.channel;
  if (
    !post ||
    (channel !== undefined && channel !== "bank" && channel !== "jewelry")
  )
    return send(req, res, 400, "text/plain", "Bad request");
  // A post without a channel is an older page's bank request.
  const to = channel === "jewelry" ? jewelryPoster : poster;
  if (!to)
    return send(
      req,
      res,
      503,
      "text/plain",
      channel === "jewelry"
        ? "Posting jewelry isn't set up"
        : "Posting isn't set up"
    );
  if (!(await postRequest(to, me, post)))
    return send(req, res, 502, "text/plain", "Discord didn't take it");
  log(`bank web: ${me.name} (${me.id}) posted a bank request`);
  send(req, res, 204, "text/plain", "");
}

const POSTS: Record<
  string,
  (req: IncomingMessage, res: ServerResponse, me: Session) => Promise<void>
> = { "/api/errors": pageError, "/api/bank-request": bankRequest };

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", bankWebUrl);
  const post = req.method === "POST" ? POSTS[url.pathname] : undefined;
  if (post) {
    const me = session(req);
    return me
      ? post(req, res, me)
      : send(req, res, 401, "text/plain", "Sign in");
  }
  if (req.method !== "GET" && req.method !== "HEAD")
    return send(req, res, 405, "text/plain", "Method not allowed");
  if (url.pathname === "/healthz")
    return send(req, res, 200, "text/plain", "ok");

  // Icons are the wiki's own public images, so they need no sign-in and cache for a week.
  const icon = url.pathname.match(/^\/icons\/(\d+)\.png$/);
  if (icon) {
    const p = wiki.iconPath(+icon[1]);
    return p
      ? send(req, res, 200, "image/png", readFileSync(p), {
          "Cache-Control": "public, max-age=604800",
        })
      : send(req, res, 404, "text/plain", "Not found");
  }

  if (!auth && !NO_AUTH)
    return message(
      req,
      res,
      503,
      "Not open yet",
      "The guild bank site isn't set up yet.",
      false
    );
  if (auth) {
    switch (url.pathname) {
      case "/auth/login":
        return auth.login(res);
      case "/auth/callback":
        return auth.callback(req, res, url);
      case "/auth/logout":
        return auth.logout(res);
      case "/signed-out":
        return message(
          req,
          res,
          200,
          "Signed out",
          "You're signed out of the guild bank."
        );
    }
  }

  const me = session(req);
  if (url.pathname === "/api/bank") {
    if (!me)
      return send(
        req,
        res,
        401,
        "application/json",
        JSON.stringify({ error: "sign in" })
      );
    return send(
      req,
      res,
      200,
      "application/json",
      JSON.stringify({ ...(await api.bank()), me: { name: me.name } })
    );
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    if (!me) return auth!.login(res);
    return send(
      req,
      res,
      200,
      "text/html; charset=utf-8",
      readPage(),
      PAGE_HEADERS
    );
  }
  send(req, res, 404, "text/plain", "Not found");
}

// Every request goes through here; a thrown error is filed and answered with a 500.
export function handle(req: IncomingMessage, res: ServerResponse) {
  return route(req, res).catch((err) => {
    reportError({
      source: "web",
      ...describeError(err),
      feature: `${req.method} ${(req.url || "").split("?")[0]}`,
      outcome: 'The request got a 500 "Something went wrong".',
    });
    // Every route answers in one send or redirect, so nothing throws once headers are out; ending
    // the response is only a guard in case a route someday streams.
    /* istanbul ignore else */
    if (!res.headersSent)
      send(req, res, 500, "text/plain", "Something went wrong");
    else res.end();
  });
}

export const readSpellSheet = () => api.refreshSheet();
export const readSkySheet = () => api.refreshSkySheet();
export const readResearchSheet = () => api.refreshResearchSheet();
export const readJewelrySheet = () => api.refreshJewelrySheet();
export const refreshWiki = () => api.refreshWiki();

// Listening, the wiki refresh and the process handlers only start when this file is run, so tests can import it.
export function start() {
  createServer(handle).listen(+PORT, () =>
    log(
      `bank web: listening on ${PORT} as ${bankWebUrl}${
        NO_AUTH ? " (no auth)" : ""
      }`
    )
  );

  // Keep icons, auctions, spell prices, Sky islands, research items and jewelry current in the background; the page never waits on the
  // wiki or the sheets.
  const inBackground = (what: string, run: () => Promise<unknown>) => () =>
    run().catch((err) => {
      const { message, stack } = describeError(err);
      reportError({
        source: "web",
        message: `${what} failed: ${message}`,
        stack,
        feature: what,
        outcome:
          "The bank page kept showing what it had before: icons, auctions, spell prices, Sky islands, research items or jewelry go stale until a refresh works.",
      });
    });
  for (const refresh of [
    inBackground("wiki refresh", refreshWiki),
    inBackground("spell sheet refresh", readSpellSheet),
    inBackground("sky sheet refresh", readSkySheet),
    inBackground("research sheet refresh", readResearchSheet),
    inBackground("jewelry sheet refresh", readJewelrySheet),
  ]) {
    refresh();
    setInterval(refresh, WIKI_EVERY);
  }

  process.on("unhandledRejection", (reason: unknown) => {
    reportError({
      source: "web",
      ...describeError(reason),
      feature:
        "unknown: it escaped every handler (see Just before for what led up to it)",
      outcome:
        "Unknown: the bank site kept running, but whatever was waiting on this gave up partway.",
    });
  });
  process.on("uncaughtException", (err) => {
    // Report, then exit as Node would have; Dokku starts the process again.
    const exit = () => process.exit(1);
    setTimeout(exit, 5000).unref();
    reportError({
      source: "web",
      ...describeError(err),
      feature:
        "unknown: it escaped every handler (see Just before for what led up to it)",
      outcome:
        "The bank site crashed and Dokku restarted it: pages and requests failed until it was back.",
    }).finally(exit);
  });
}

if (require.main === module) start();
