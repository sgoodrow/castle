import { Invite } from "../../db/invite";
import { sortInvites } from "./update-action";
import { PendingButtonCommand } from "./who-pending-button-command";

class WhoButtonCommand extends PendingButtonCommand {
  protected getContent(pending: Invite[]): string {
    const whos = pending
      .sort(sortInvites)
      .map((p) => `/who all ${p.name}`)
      .join("\n");

    return `Sorted by highest priority (mains > alts, invites > interviews, old > new):
${whos}`;
  }
}

export const whoButtonCommand = new WhoButtonCommand("whoinvite");
