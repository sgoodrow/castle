import { Invite } from "../../db/invite";
import { PendingButtonCommand } from "./who-pending-button-command";

class FriendConfigButtonCommand extends PendingButtonCommand {
  protected getContent(pending: Invite[]): string {
    const config = `[Friends]
${pending
  .slice(0, 100)
  .map((p, i) => p.getFriendEntry(i + 1))
  .join("\n")}`;
    return `Paste into your \`/EverQuest/<CHAR>_P1999Green.ini\` file:
${config}`;
  }
}

export const friendConfigButtonCommand = new FriendConfigButtonCommand(
  "friendconfig"
);
