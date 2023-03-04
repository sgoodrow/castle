import { RaidReport } from "../raid-report";

export abstract class Action {
  public constructor(protected readonly args: string[]) {}

  public abstract execute(raid: RaidReport): void;
  public abstract validateArgs(): void;

  protected getFormatError(error: string) {
    return new Error(`Invalid "${this.constructor.name}" format, ${error}`);
  }
}
