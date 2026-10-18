import { IncomingMessage, ServerResponse } from "http";
import { gunzipSync } from "zlib";
import { redirect, send } from "./respond";

const fakeReq = (headers: Record<string, string> = {}, method = "GET") =>
  ({ method, headers }) as unknown as IncomingMessage;

const fakeRes = () => {
  const r = {
    status: 0,
    headers: {} as Record<string, string | string[]>,
    body: undefined as Buffer | undefined,
    ended: false,
    writeHead(status: number, headers: Record<string, string | string[]>) {
      r.status = status;
      r.headers = headers;
      return r;
    },
    end(body?: Buffer) {
      r.body = body;
      r.ended = true;
    },
  };
  return r;
};
const asRes = (r: ReturnType<typeof fakeRes>) => r as unknown as ServerResponse;

const big = "x".repeat(2000);

describe("send", () => {
  test("gzips a large text body when the client accepts gzip", () => {
    const res = fakeRes();
    send(
      fakeReq({ "accept-encoding": "gzip, deflate, br" }),
      asRes(res),
      200,
      "text/html",
      big
    );
    expect(res.status).toBe(200);
    expect(res.headers["Content-Encoding"]).toBe("gzip");
    expect(gunzipSync(res.body!).toString()).toBe(big);
  });

  test("does not gzip a body of 1KB or less", () => {
    const res = fakeRes();
    send(
      fakeReq({ "accept-encoding": "gzip" }),
      asRes(res),
      200,
      "text/plain",
      "x".repeat(1024)
    );
    expect(res.headers["Content-Encoding"]).toBeUndefined();
    expect(res.body!.toString()).toBe("x".repeat(1024));
  });

  test("does not gzip when the client doesn't accept gzip", () => {
    for (const headers of [
      {} as Record<string, string>,
      { "accept-encoding": "deflate, br" },
      { "accept-encoding": "xgzip" },
    ]) {
      const res = fakeRes();
      send(fakeReq(headers), asRes(res), 200, "text/plain", big);
      expect(res.headers["Content-Encoding"]).toBeUndefined();
      expect(res.body!.toString()).toBe(big);
    }
  });

  test("does not gzip images", () => {
    const res = fakeRes();
    const png = Buffer.alloc(4096, 1);
    send(
      fakeReq({ "accept-encoding": "gzip" }),
      asRes(res),
      200,
      "image/png",
      png
    );
    expect(res.headers["Content-Encoding"]).toBeUndefined();
    expect(res.body).toBe(png);
  });

  test("HEAD sends headers but no body", () => {
    const res = fakeRes();
    send(
      fakeReq({ "accept-encoding": "gzip" }, "HEAD"),
      asRes(res),
      200,
      "text/html",
      big
    );
    expect(res.status).toBe(200);
    expect(res.headers["Content-Type"]).toBe("text/html");
    expect(res.ended).toBe(true);
    expect(res.body).toBeUndefined();
  });

  test("sets the default headers and lets callers override them", () => {
    const res = fakeRes();
    send(fakeReq(), asRes(res), 200, "application/json", "{}", {
      "Cache-Control": "max-age=60",
    });
    expect(res.headers).toMatchObject({
      "Content-Type": "application/json",
      "Cache-Control": "max-age=60",
      "X-Content-Type-Options": "nosniff",
    });
  });
});

describe("redirect", () => {
  test("sends a 302 with Location and any cookies", () => {
    const res = fakeRes();
    redirect(asRes(res), "/somewhere", ["a=1", "b=2"]);
    expect(res.status).toBe(302);
    expect(res.headers).toMatchObject({
      Location: "/somewhere",
      "Set-Cookie": ["a=1", "b=2"],
    });
    expect(res.ended).toBe(true);
  });

  test("leaves out Set-Cookie when there are no cookies", () => {
    const res = fakeRes();
    redirect(asRes(res), "/");
    expect(res.headers["Set-Cookie"]).toBeUndefined();
  });
});
