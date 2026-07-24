import { Command } from "../../shared/command/command";
import { registerSubcommand } from "./commands/register-subcommand";
import { unregisterSubcommand } from "./commands/unregister-subcommand";
import { addTagSubcommand } from "./commands/add-tag-subcommand";
import { removeTagSubcommand } from "./commands/remove-tag-subcommand";
import { listTagsSubcommand } from "./commands/list-tags-subcommand";
import { clearTagsSubcommand } from "./commands/clear-tags-subcommand";
import { testSubcommand } from "./commands/test-subcommand";
import { addUserSubcommand } from "./commands/add-user-subcommand";
import { removeUserSubcommand } from "./commands/remove-user-subcommand";
import { listUsersSubcommand } from "./commands/list-users-subcommand";

export const eqnotifyCommand = new Command(
  "eqnotify",
  "Get phone notifications for the raid targets you care about.",
  [
    registerSubcommand,
    unregisterSubcommand,
    addTagSubcommand,
    removeTagSubcommand,
    listTagsSubcommand,
    clearTagsSubcommand,
    testSubcommand,
    addUserSubcommand,
    removeUserSubcommand,
    listUsersSubcommand,
  ]
);
