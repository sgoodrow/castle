interface BaseCredit {
  character: string;
}

interface PilotCredit extends BaseCredit {
  type: "PILOT";
  pilot: string;
  reason: string;
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

// matches "botpilot", "Botpilot", "bot pilot", "bot-pilot", etc.
const PILOT_KEYWORD_VARIANTS = /\bbot[\s_-]*pilot\b/gi;

// lowercase and strip punctuation so "Botpilot:" matches the keyword
const normalizeWord = (word?: string) =>
  word?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

// character names are letters only, so drop trailing commas, colons, etc.
const cleanName = (word: string) => word.replace(/[^a-zA-Z]/g, "");

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
    this.record = words.join(" ").trim().replace(PILOT_KEYWORD_VARIANTS, PILOT_KEYWORD);
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
    const words = this.record.split(" ");
    if ([words[0], words[1]].map(normalizeWord).includes(PILOT_KEYWORD)) {
      return "PILOT";
    }
    return "REASON";
  }

  private get pilotCredit(): PilotCredit | UnknownCredit {
    const words = this.record.split(" ");
    const pilot =
      normalizeWord(words[0]) === PILOT_KEYWORD
        ? cleanName(words[1] ?? "")
        : normalizeWord(words[1]) === PILOT_KEYWORD
          ? cleanName(words[0])
          : "";
    if (pilot) {
      return {
        type: "PILOT",
        character: this.character,
        pilot,
        reason: words.slice(2).join(" "),
      };
    }
    return {
      type: "UNKNOWN",
      character: this.character,
      raw: this.raw,
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
