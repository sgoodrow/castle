import { Option } from "./item-subcommand";
import { itemsMap } from "../../shared/items";
import { BaseThreadBuilder } from "./base-thread-builder";

export class ItemThreadBuilder extends BaseThreadBuilder {
  protected override getLocation() {
    const user = this.getOption(Option.HeldBy)?.user;
    if (user) {
      return this.count > 1
        ? `These items are on ${user}`
        : `This item is on ${user}`;
    }
    return super.getLocation();
  }

  private get itemId() {
    return String(this.getOption(Option.ItemId)?.value);
  }

  protected getItem() {
    const s = itemsMap[this.itemId];
    if (!s) {
      throw new Error(`Could not find item with ID ${this.itemId}`);
    }
    return s;
  }
}
