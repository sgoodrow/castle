interface BaseCredit {
  character: string;
}

interface PilotCredit extends BaseCredit {
  type: "PILOT";
  pilot: string;
}

interface ReasonCredit extends BaseCredit {
  type: "REASON";
  reason: string;
}

interface UnknownCredit extends BaseCredit {
  type: "UNKNOWN";
  raw: string;
}

export type CreditData = PilotCredit | ReasonCredit | UnknownCredit;

const PILOT_KEYWORD = "botpilot";

export class CreditParser {
  public readonly character: string;
  protected readonly raw: string;
  protected readonly record: string;

  public constructor(record: string) {
    const stripped = record
      // remove wrapping quotes
      .replace(/"/g, "")
      // remove bracketed expressions
      .replace(/\[.+?\]/g, "")
      // remove excess whitespace
      .trim()
      // remove wrapping single quotes
      .replace(/'/g, "");
    this.character = stripped.split(" ", 1)[0];
    const credit = stripped.toLowerCase().indexOf("creditt");
    this.raw = stripped.slice(credit);
    const words = this.raw.split(" ");
    words.shift();
    this.record = words.join(" ").trim();
  }

  public getCredit(): CreditData {
    switch (this.type) {
      case "PILOT":
        return this.pilotCredit;
      case "REASON":
        return this.reasonCredit;
      case "UNKNOWN":
        return this.unknownCredit;
    }
  }

  private get type() {
    if (!this.record) {
      return "UNKNOWN";
    }
    return this.record.split(" ")[0] === PILOT_KEYWORD ? "PILOT" : "REASON";
  }

  private get pilotCredit(): PilotCredit | UnknownCredit {
    const pilot = this.record.split(PILOT_KEYWORD)[1].trim();
    if (!this.character || !pilot) {
      return this.unknownCredit;
    }
    return {
      type: "PILOT",
      character: this.character,
      pilot,
    };
  }

  private get reasonCredit(): ReasonCredit | UnknownCredit {
    if (!this.record) {
      return this.unknownCredit;
    }
    return {
      type: "REASON",
      reason: this.record,
      character: this.character,
    };
  }

  private get unknownCredit(): UnknownCredit {
    return {
      type: "UNKNOWN",
      character: this.character,
      raw: this.raw,
    };
  }
}
