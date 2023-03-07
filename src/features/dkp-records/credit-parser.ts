interface BaseCredit {
  player: string;
}

interface PilotCredit extends BaseCredit {
  type: "PILOT";
  character: string;
}

interface ReasonCredit extends BaseCredit {
  type: "REASON";
  reason: string;
}

interface UnknownCredit extends BaseCredit {
  type: "UNKNOWN";
  raw: string;
}

export type Credit = PilotCredit | ReasonCredit | UnknownCredit;

export class CreditParser {
  public readonly player: string;
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
    this.player = stripped.split(" ", 1)[0];
    const credit = stripped.toLowerCase().indexOf("creditt");
    this.raw = stripped.slice(credit);
    const words = this.raw.split(" ");
    words.shift();
    this.record = words.join(" ").trim();
  }

  public getCredit(): Credit {
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
    return this.record.split(" ")[0] === "on" ? "PILOT" : "REASON";
  }

  private get pilotCredit(): PilotCredit | UnknownCredit {
    const character = this.record.split("on ")[1];
    if (!this.player || !character) {
      return this.unknownCredit;
    }
    return {
      type: "PILOT",
      player: this.player,
      character: character,
    };
  }

  private get reasonCredit(): ReasonCredit | UnknownCredit {
    if (!this.record) {
      return this.unknownCredit;
    }
    return {
      type: "REASON",
      reason: this.record,
      player: this.player,
    };
  }

  private get unknownCredit(): UnknownCredit {
    return {
      type: "UNKNOWN",
      player: this.player,
      raw: this.raw,
    };
  }
}
