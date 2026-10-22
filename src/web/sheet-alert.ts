// Tells the bankers when a bank sheet breaks: once when it breaks and once when it reads again, not
// on every refresh. A message that Discord refuses is tried again on the next refresh.
import { log } from "../shared/logger";

export class SheetAlert {
  private reported = ""; // what was last posted; "" while the sheet reads cleanly

  // `sheet` is what the message calls it, e.g. "The spell sheet".
  constructor(
    private sheet: string,
    private post: (message: string) => Promise<void>
  ) {}

  // Pass the problem, or "" once the sheet reads cleanly.
  async report(problem: string) {
    if (problem === this.reported) return;
    const message = problem || `${this.sheet} reads again.`;
    try {
      await this.post(message.slice(0, 2000)); // Discord's limit for one message
      this.reported = problem; // only once it's posted, so a failed post is tried again
    } catch (e) {
      log(`bank web: ${this.sheet}: couldn't tell the bank office: ${e}`);
    }
  }
}
