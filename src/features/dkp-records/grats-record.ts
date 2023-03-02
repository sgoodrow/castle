import { Record } from "./record";

export class GratsRecord extends Record {
  public toString() {
    return this.record;
  }

  protected override get keyword() {
    return "gratss";
  }
}
