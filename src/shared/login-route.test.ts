import { describe, expect, it } from "vitest";
import { loginRoute, type Holder } from "./login-route";

const held = (char: string, count = 1): Holder => ({ char, loc: "Bank1", count, mq: false });
const need = (qty: number, holders: Holder[], auction = false) => ({
  it: { holders },
  qty,
  auction,
});

describe("the fewest logins for a request", () => {
  it("logs in to one character that holds everything, when there is one", () => {
    const route = loginRoute([
      need(1, [held("Mulea"), held("Muleb")]),
      need(1, [held("Muleb"), held("Mulec")]),
    ]);
    expect(route.logins).toEqual(["Muleb"]);
  });

  it("takes a line from a second character when no one holds enough", () => {
    const route = loginRoute([need(3, [held("Mulea", 2), held("Muleb", 2)])]);
    expect(route.logins).toEqual(["Mulea", "Muleb"]);
    expect(route.lines[0]!.from).toEqual(["Mulea", "Muleb"]);
  });

  it("needs no login for a DKP auction line", () => {
    const route = loginRoute([need(1, [held("Mulea")], true)]);
    expect(route.logins).toEqual([]);
  });
});
