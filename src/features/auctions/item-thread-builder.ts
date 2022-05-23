import { itemsMap } from "../../shared/items";
import { BaseThreadBuilder } from "./base-thread-builder";

export class ItemThreadBuilder extends BaseThreadBuilder {
  protected getName() {
    const s = itemsMap[this.name];
    if (!s) {
      throw new Error(`Could not find item named ${this.name}`);
    }
    return s;
  }
}
