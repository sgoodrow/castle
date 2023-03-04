export class CreditRecord {
  protected readonly words: string[];
  protected readonly record: string;

  public constructor(record: string) {
    if (record.endsWith('"')) {
      record = record.substring(0, record.length - 1);
    }
    if (record.endsWith("'")) {
      record = record.substring(0, record.length - 1);
    }
    const recordWords = record.split(" ");
    const creditWordIndex = recordWords.findIndex((word) =>
      word.includes(this.keyword)
    );
    this.words = recordWords.splice(creditWordIndex + 1);
    this.record = this.words.join(" ");
  }

  protected get keyword() {
    return "creditt";
  }

  public toString() {
    switch (this.type) {
      case "PILOT":
        return this.pilotString;
      case "REASON":
        return this.reasonString;
      case "UNKNOWN":
        return this.record;
    }
  }

  private get type() {
    if (!this.record) {
      return "UNKNOWN";
    }
    return this.record.includes(" on ") ? "PILOT" : "REASON";
  }

  private get pilotString() {
    const [pilot, ...plane] = this.record.split(" on ");
    return `${this.type}: ${pilot} on ${plane?.[0]}`;
  }

  private get reasonString() {
    const [player, ...reason] = this.record.split(" ");
    return `${this.type}: ${player} because ${reason.join(" ").trim()}`;
  }
}
