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

  it("doesn't work if pilot is missing", () => {
    const parser = new CreditParser(
      "[Sat Feb 25 16:15:52 2023] Iceburgh -> Someone: creditt botpilot"
    );
    const credit = parser.getCredit();
    expect(credit.type).toEqual("UNKNOWN");
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
