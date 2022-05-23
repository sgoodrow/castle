import { spellsMap } from "../../shared/spells";
import { BaseThreadBuilder } from "./base-thread-builder";

export class SpellThreadBuilder extends BaseThreadBuilder {
  protected getName() {
    const s = spellsMap[this.name];
    if (!s) {
      throw new Error(`Could not find spell named ${this.name}`);
    }
    return s;
  }
}
