import { createHmac } from "crypto";
import { IncomingMessage, ServerResponse } from "http";
import { Auth, AuthConfig, cookies, Session } from "./auth";

jest.mock("../shared/logger", () => ({ log: jest.fn() }));

const config: AuthConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  guildId: "guild-id",
  roleId: "bank-role",
  secret: "test-secret",
  baseUrl: "https://bank.example.com",
};

const fakeReq = (cookie?: string) => ({ method: "GET", headers: cookie === undefined ? {} : { cookie } } as unknown as IncomingMessage);

const fakeRes = () => {
  const r = {
    status: 0,
    headers: {} as Record<string, string | string[]>,
    body: undefined as Buffer | undefined,
    writeHead(status: number, headers: Record<string, string | string[]>) {
      r.status = status;
      r.headers = headers;
      return r;
    },
    end(body?: Buffer) {
      r.body = body;
    },
  };
  return r;
};
const asRes = (r: ReturnType<typeof fakeRes>) => r as unknown as ServerResponse;

const setCookies = (r: ReturnType<typeof fakeRes>) => r.headers["Set-Cookie"] as string[];
// "name=value; Path=/; ..." -> "name=value"
const pair = (setCookie: string) => setCookie.split(";")[0];

// Build a session cookie the same way Auth does.
const signed = (s: object, secret = config.secret) => {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
};
const future = () => Date.now() + 3600_000;

describe("cookies", () => {
  test("parses name=value pairs", () => {
    expect(cookies(fakeReq("a=1; b=two;c=3"))).toEqual({ a: "1", b: "two", c: "3" });
  });

  test("keeps '=' inside values", () => {
    expect(cookies(fakeReq("x=a=b=c"))).toEqual({ x: "a=b=c" });
  });

  test("handles no cookie header and junk parts", () => {
    expect(cookies(fakeReq())).toEqual({});
    expect(cookies(fakeReq("=nokey;novalue; ok=1"))).toEqual({ ok: "1" });
  });
});

describe("Auth.session", () => {
  const auth = new Auth(config);
  const s: Session = { id: "123", name: "Tester", exp: 0 };

  test("accepts a cookie it signed", () => {
    const session = { ...s, exp: future() };
    expect(auth.session(fakeReq(`other=1; bank_session=${signed(session)}`))).toEqual(session);
  });

  test("rejects a tampered body", () => {
    const [, sig] = signed({ ...s, exp: future() }).split(".");
    const body = Buffer.from(JSON.stringify({ ...s, id: "999", exp: future() })).toString("base64url");
    expect(auth.session(fakeReq(`bank_session=${body}.${sig}`))).toBeNull();
  });

  test("rejects a tampered or missing signature", () => {
    const [body, sig] = signed({ ...s, exp: future() }).split(".");
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(auth.session(fakeReq(`bank_session=${body}.${flipped}`))).toBeNull();
    expect(auth.session(fakeReq(`bank_session=${body}.${sig.slice(1)}`))).toBeNull();
    expect(auth.session(fakeReq(`bank_session=${body}.`))).toBeNull();
    expect(auth.session(fakeReq(`bank_session=${body}`))).toBeNull();
  });

  test("rejects a cookie signed with another secret", () => {
    expect(auth.session(fakeReq(`bank_session=${signed({ ...s, exp: future() }, "other-secret")}`))).toBeNull();
  });

  test("rejects an expired session", () => {
    expect(auth.session(fakeReq(`bank_session=${signed({ ...s, exp: Date.now() - 1 })}`))).toBeNull();
  });

  test("rejects garbage", () => {
    expect(auth.session(fakeReq())).toBeNull();
    expect(auth.session(fakeReq("bank_session="))).toBeNull();
    expect(auth.session(fakeReq("bank_session=garbage"))).toBeNull();
    expect(auth.session(fakeReq("bank_session=a.b.c"))).toBeNull();
    // Correctly signed, but not a session.
    expect(auth.session(fakeReq(`bank_session=${signed({})}`))).toBeNull();
    const notJson = Buffer.from("not json").toString("base64url");
    const sig = createHmac("sha256", config.secret).update(notJson).digest("base64url");
    expect(auth.session(fakeReq(`bank_session=${notJson}.${sig}`))).toBeNull();
    const nul = Buffer.from("null").toString("base64url");
    const nulSig = createHmac("sha256", config.secret).update(nul).digest("base64url");
    expect(auth.session(fakeReq(`bank_session=${nul}.${nulSig}`))).toBeNull();
  });
});

describe("Auth.cookie", () => {
  test("adds Secure for an https base URL", () => {
    expect(new Auth(config).cookie("n", "v", 60)).toBe("n=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure");
  });

  test("leaves out Secure for an http base URL", () => {
    expect(new Auth({ ...config, baseUrl: "http://localhost:3000" }).cookie("n", "v", 60)).toBe("n=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=60");
  });
});

describe("Auth.login", () => {
  test("sets a bank_state cookie and redirects to Discord", () => {
    const res = fakeRes();
    new Auth(config).login(asRes(res));
    expect(res.status).toBe(302);
    const [stateCookie] = setCookies(res);
    expect(stateCookie).toMatch(/^bank_state=[\w-]+; .*Max-Age=600/);
    const state = pair(stateCookie).split("=")[1];

    const to = new URL(res.headers.Location as string);
    expect(to.origin + to.pathname).toBe("https://discord.com/oauth2/authorize");
    expect(to.searchParams.get("client_id")).toBe("client-id");
    expect(to.searchParams.get("redirect_uri")).toBe("https://bank.example.com/auth/callback");
    expect(to.searchParams.get("response_type")).toBe("code");
    expect(to.searchParams.get("state")).toBe(state);
  });

  test("uses a fresh state each time", () => {
    const a = fakeRes(), b = fakeRes();
    new Auth(config).login(asRes(a));
    new Auth(config).login(asRes(b));
    expect(pair(setCookies(a)[0])).not.toBe(pair(setCookies(b)[0]));
  });
});

describe("Auth.logout", () => {
  test("clears the session cookie", () => {
    const res = fakeRes();
    new Auth(config).logout(asRes(res));
    expect(res.status).toBe(302);
    expect(res.headers.Location).toBe("/signed-out");
    expect(setCookies(res)[0]).toMatch(/^bank_session=; .*Max-Age=0/);
  });
});

describe("Auth.callback", () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body } as Response);
  const member = (roles: string[]) => ({ roles, nick: "Nick", user: { id: "42", username: "user", global_name: "Global" } });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  const callback = async (query: string, cookie?: string) => {
    const res = fakeRes();
    const auth = new Auth(config);
    await auth.callback(fakeReq(cookie), asRes(res), new URL(`https://bank.example.com/auth/callback?${query}`));
    return { res, auth };
  };

  test("a cancelled sign-in is a 403", async () => {
    const { res } = await callback("error=access_denied&state=s", "bank_state=s");
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a state mismatch is a 400 and doesn't call Discord", async () => {
    const { res } = await callback("code=c&state=s1", "bank_state=s2");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a missing state cookie is a 400", async () => {
    const { res } = await callback("code=c&state=s1");
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a failed token exchange is a 502", async () => {
    fetchMock.mockResolvedValueOnce(json(401, {}));
    const { res } = await callback("code=c&state=s", "bank_state=s");
    expect(res.status).toBe(502);
  });

  test("someone not in the guild is a 403", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "tok" })).mockResolvedValueOnce(json(404, {}));
    const { res } = await callback("code=c&state=s", "bank_state=s");
    expect(res.status).toBe(403);
    expect(res.headers["Set-Cookie"]).toBeUndefined();
  });

  test("a failed member lookup is a 502", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "tok" })).mockResolvedValueOnce(json(500, {}));
    const { res } = await callback("code=c&state=s", "bank_state=s");
    expect(res.status).toBe(502);
  });

  test("a member without the bank role is a 403", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "tok" })).mockResolvedValueOnce(json(200, member(["other-role"])));
    const { res } = await callback("code=c&state=s", "bank_state=s");
    expect(res.status).toBe(403);
    expect(res.headers["Set-Cookie"]).toBeUndefined();
  });

  test("a member with the bank role gets a session and is sent home", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "tok" })).mockResolvedValueOnce(json(200, member(["x", "bank-role"])));
    const { res, auth } = await callback("code=the-code&state=s", "bank_state=s");

    expect(res.status).toBe(302);
    expect(res.headers.Location).toBe("/");
    const [sessionCookie, stateCookie] = setCookies(res);
    expect(sessionCookie).toMatch(/^bank_session=.*; Secure$/);
    expect(stateCookie).toMatch(/^bank_state=; .*Max-Age=0/);

    const session = auth.session(fakeReq(pair(sessionCookie)));
    expect(session).toMatchObject({ id: "42", name: "Nick" });
    expect(session!.exp).toBeGreaterThan(Date.now() + 6 * 864e5);

    // The token exchange used the code and the same redirect_uri as login.
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://discord.com/api/v10/oauth2/token");
    const form = tokenInit.body as URLSearchParams;
    expect(form.get("code")).toBe("the-code");
    expect(form.get("redirect_uri")).toBe("https://bank.example.com/auth/callback");
    const [memberUrl, memberInit] = fetchMock.mock.calls[1];
    expect(memberUrl).toBe("https://discord.com/api/v10/users/@me/guilds/guild-id/member");
    expect(memberInit.headers.Authorization).toBe("Bearer tok");
  });

  test("falls back from nick to global name to username", async () => {
    const m = member(["bank-role"]);
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "tok" })).mockResolvedValueOnce(json(200, { ...m, nick: undefined }));
    const { res, auth } = await callback("code=c&state=s", "bank_state=s");
    expect(auth.session(fakeReq(pair(setCookies(res)[0])))!.name).toBe("Global");

    fetchMock.mockResolvedValueOnce(json(200, { access_token: "tok" })).mockResolvedValueOnce(json(200, { ...m, nick: undefined, user: { id: "42", username: "user" } }));
    const second = await callback("code=c&state=s", "bank_state=s");
    expect(second.auth.session(fakeReq(pair(setCookies(second.res)[0])))!.name).toBe("user");
  });
});
