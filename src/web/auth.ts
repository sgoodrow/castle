// Discord sign-in for the bank page. Only Castle members with the bank role get in, and the
// session is a signed cookie, so nothing is kept server-side.
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { IncomingMessage, ServerResponse } from "http";
import { log } from "../shared/logger";
import { message, redirect } from "./respond";

const DISCORD = "https://discord.com/api/v10";
const SESSION_DAYS = 7;

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  guildId: string;
  roleId: string;
  secret: string;
  baseUrl: string;
}

export type Session = { id: string; name: string; exp: number };

export function cookies(req: IncomingMessage) {
  const out: Record<string, string> = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export class Auth {
  private secure: boolean;
  private redirectUri: string;

  constructor(private c: AuthConfig) {
    this.secure = c.baseUrl.startsWith("https:");
    this.redirectUri = `${c.baseUrl}/auth/callback`;
  }

  private sign(s: string) {
    return createHmac("sha256", this.c.secret).update(s).digest("base64url");
  }

  cookie(name: string, value: string, maxAge: number) {
    return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${this.secure ? "; Secure" : ""}`;
  }

  session(req: IncomingMessage): Session | null {
    const [body, sig] = (cookies(req).bank_session || "").split(".");
    if (!body || !sig) return null;
    const want = Buffer.from(this.sign(body)),
      got = Buffer.from(sig);
    if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
    try {
      const s: Session = JSON.parse(Buffer.from(body, "base64url").toString());
      return s.exp > Date.now() ? s : null;
    } catch {
      return null;
    }
  }

  private sessionCookie(s: Session) {
    const body = Buffer.from(JSON.stringify(s)).toString("base64url");
    return this.cookie(
      "bank_session",
      `${body}.${this.sign(body)}`,
      SESSION_DAYS * 86400
    );
  }

  logout(res: ServerResponse) {
    redirect(res, "/signed-out", [this.cookie("bank_session", "", 0)]);
  }

  login(res: ServerResponse) {
    const state = randomBytes(16).toString("base64url");
    const q = new URLSearchParams({
      client_id: this.c.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "identify guilds.members.read",
      state,
      prompt: "none",
    });
    redirect(res, `https://discord.com/oauth2/authorize?${q}`, [
      this.cookie("bank_state", state, 600),
    ]);
  }

  async callback(req: IncomingMessage, res: ServerResponse, url: URL) {
    if (url.searchParams.get("error"))
      return message(
        req,
        res,
        403,
        "Sign-in cancelled",
        "Discord sign-in was cancelled."
      );
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state || state !== cookies(req).bank_state)
      return message(
        req,
        res,
        400,
        "Sign-in expired",
        "That sign-in link was stale. Try again."
      );
    const tokenRes = await fetch(`${DISCORD}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        client_id: this.c.clientId,
        client_secret: this.c.clientSecret,
      }),
    });
    if (!tokenRes.ok) {
      log(`bank web: token exchange failed ${tokenRes.status}`);
      return message(
        req,
        res,
        502,
        "Discord sign-in failed",
        "Discord didn't accept the sign-in. Try again."
      );
    }
    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };
    const memberRes = await fetch(
      `${DISCORD}/users/@me/guilds/${this.c.guildId}/member`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (memberRes.status === 404)
      return message(
        req,
        res,
        403,
        "Not in Castle",
        "This Discord account isn't in the Castle server."
      );
    if (!memberRes.ok) {
      log(`bank web: member lookup failed ${memberRes.status}`);
      return message(
        req,
        res,
        502,
        "Discord sign-in failed",
        "Couldn't read your Castle roles from Discord. Try again in a minute."
      );
    }
    const member = (await memberRes.json()) as {
      roles: string[];
      nick?: string;
      user: { id: string; username: string; global_name?: string };
    };
    if (!member.roles.includes(this.c.roleId))
      return message(
        req,
        res,
        403,
        "Members only",
        "The guild bank is open to Castle members with the bank role."
      );
    const name = member.nick || member.user.global_name || member.user.username;
    log(`bank web: ${name} (${member.user.id}) signed in`);
    redirect(res, "/", [
      this.sessionCookie({
        id: member.user.id,
        name,
        exp: Date.now() + SESSION_DAYS * 864e5,
      }),
      this.cookie("bank_state", "", 0),
    ]);
  }
}
