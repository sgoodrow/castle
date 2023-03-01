import { Record } from "./record";

// creditt Pumped on Bot
// creditt Pumped reason

export class CreditRecord extends Record {
  protected override get keyword() {
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
