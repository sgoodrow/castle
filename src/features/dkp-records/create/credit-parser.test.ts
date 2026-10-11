import { CreditParser } from "./credit-parser";

describe("pilot", () => {
  it("works for arrow tells", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:52 2023] Iceburgh -> Someone: creditt botpilot Pumped because we needed him"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("PILOT");
    expect(credit.character).toEqual("Iceburgh");

    if (credit.type === "PILOT") {
      expect(credit.pilot).toEqual("Pumped");
      expect(credit.reason).toEqual("because we needed him");
    }
  });

  it("works if botpilot is second", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:52 2023] Iceburgh -> Someone: creditt Pumped botpilot because we needed him"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("PILOT");
    expect(credit.character).toEqual("Iceburgh");

    if (credit.type === "PILOT") {
      expect(credit.pilot).toEqual("Pumped");
      expect(credit.reason).toEqual("because we needed him");
    }
  });

  it.each([
    "creditt Botpilot Pumped because we needed him",
    "creditt BOTPILOT Pumped because we needed him",
    "creditt bot pilot Pumped because we needed him",
    "creditt Bot Pilot Pumped because we needed him",
    "creditt bot-pilot Pumped because we needed him",
    "creditt botpilot: Pumped, because we needed him",
    "creditt Pumped Bot Pilot because we needed him",
    "creditt Pumped, botpilot because we needed him",
  ])("ignores case, spacing and punctuation: %s", (tell) => {
    const credit = new CreditParser(
      `[Sat Feb 25 16:15:52 2023] Iceburgh -> Someone: ${tell}`
    ).getCredit();
    expect(credit.type).toEqual("PILOT");

    if (credit.type === "PILOT") {
      expect(credit.pilot).toEqual("Pumped");
      expect(credit.reason).toEqual("because we needed him");
    }
  });

  it("works for quote tells with mixed case", () => {
    const credit = new CreditParser(
      "[Sat Feb 25 16:15:52 2023] Iceburgh tells you, 'Creditt Botpilot Pumped'"
    ).getCredit();
    expect(credit.type).toEqual("PILOT");

    if (credit.type === "PILOT") {
      expect(credit.pilot).toEqual("Pumped");
      expect(credit.reason).toEqual("");
    }
  });

  it("doesn't work if pilot is missing", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:52 2023] Iceburgh -> Someone: creditt botpilot"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("UNKNOWN");
  });

  it("doesn't work if pilot is missing with spaced keyword", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:52 2023] Iceburgh -> Someone: creditt Bot Pilot"
    );
    expect(parser.getCredit().type).toEqual("UNKNOWN");
  });
});

describe("reason", () => {
  it("works for quote tells", () => {
    const parser = new CreditParser(
      "[Wed Mar 01 23:45:27 2023] Pumped tells you, 'Creditt for being a cleric on a CH chain'"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("REASON");
    expect(credit.character).toEqual("Pumped");

    if (credit.type === "REASON") {
      expect(credit.reason).toEqual("for being a cleric on a CH chain");
    }
  });

  it("works for arrow tells", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:47 2023] Pumped -> Someone: creditt dead from DT"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("REASON");
    expect(credit.character).toEqual("Pumped");

    if (credit.type === "REASON") {
      expect(credit.reason).toEqual("dead from DT");
    }
  });

  it("handles unknown for arrow tells", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:47 2023] Pumped -> Someone: creditt"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("UNKNOWN");
    expect(credit.character).toEqual("Pumped");

    if (credit.type === "UNKNOWN") {
      expect(credit.raw).toEqual("creditt");
    }
  });

  it("handles unknown for arrow tells with long credit", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:47 2023] Pumped -> Someone: credittt"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("UNKNOWN");
    expect(credit.character).toEqual("Pumped");

    if (credit.type === "UNKNOWN") {
      expect(credit.raw).toEqual("credittt");
    }
  });

  it("handles unknown for arrow tells with spaceless credit", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:47 2023] Pumped -> Someone: credittsomething"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("UNKNOWN");
    expect(credit.character).toEqual("Pumped");

    if (credit.type === "UNKNOWN") {
      expect(credit.raw).toEqual("credittsomething");
    }
  });
});
