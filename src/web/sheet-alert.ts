// Tells the bankers when a bank sheet breaks: once when it breaks and once when it reads again, not
// on every refresh. What was last posted is kept beside the sheet's copy, so a restart neither
// repeats a problem nor misses the "reads again". A message Discord refuses is tried again on the
// next refresh, and every refresh until it gets through, since a channel that refuses for good is
// worth hearing about every time the sheet is read.
import { existsSync, readFileSync, writeFileSync } from "fs";
import { log } from "../shared/logger";

export class SheetAlert {
  private reported: string; // what was last posted; "" while the sheet reads cleanly

  // `file` keeps what was last posted. `sheet` is what the messages call the sheet, e.g. "The spell sheet".
  constructor(
    private file: string,
    private sheet: string,
    private post: (message: string) => Promise<void>
  ) {
    this.reported = existsSync(file) ? readFileSync(file, "utf-8") : "";
  }

  // The sheet couldn't be read at all, so the bank keeps its last copy.
  unreadable() {
    return this.report(
      "it couldn't be read, so the bank keeps its last copy if it has one"
    );
  }

  // Pass what's wrong, e.g. "no such spell Bedlam", or "" once the sheet reads cleanly.
  async report(problem: string) {
    if (problem === this.reported) return;
    const message = problem
      ? `${this.sheet} has a problem: ${problem}.`
      : `${this.sheet} reads again.`;
    try {
      // Discord's limit for one message; a cut list says so, rather than ending mid-name
      await this.post(
        message.length > 2000 ? message.slice(0, 1997) + "..." : message
      );
    } catch (e) {
      log(`bank web: ${this.sheet}: couldn't tell the bank office: ${e}`);
      return;
    }
    this.reported = problem;
    writeFileSync(this.file, problem);
  }
}
