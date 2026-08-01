import { Message, type User } from "discord.js";
import { parseArguments } from "./parsers/argument-parser";

class PrefixOptions {
  private args: Map<string, string | number | null>;

  constructor(args: Map<string, string | number | null>) {
    this.args = args;
  }

  public getString(name: string, _required?: boolean): string | null {
    const value = this.args.get(name);
    return typeof value === "string" ? value : null;
  }

  public getInteger(name: string, _required?: boolean): number | null {
    const value = this.args.get(name);
    return typeof value === "number" ? value : null;
  }
}

/**
 * Lightweight adapter that wraps a discord.js Message so it can be passed
 * into spawn-timer slash commands (e.g. /tod) as if it were a
 * ChatInputCommandInteraction.
 */
export class PrefixInteractionAdapter {
  public options: PrefixOptions;
  public user: User;
  private message: Message;

  constructor(message: Message, optionsMap: Map<string, string | number | null>) {
    this.message = message;
    this.user = message.author;
    this.options = new PrefixOptions(optionsMap);
  }

  public async deferReply(): Promise<void> {
    // no-op; slash commands defer before execute, prefix replies inline
  }

  public async editReply(
    options: { content: string } | string
  ): Promise<Message> {
    const content = typeof options === "string" ? options : options.content;
    return this.message.reply(content);
  }
}

export function buildTodAdapter(message: Message): PrefixInteractionAdapter {
  let raw = message.content.slice(4).trim(); // strip "!tod"

  // A trailing "#<n>" indicates a skip count, e.g. "lodi 7/26 04:04:10#1"
  let skipCount: number | null = null;
  const skipMatch = raw.match(/#(\d+)\s*$/);
  if (skipMatch) {
    skipCount = parseInt(skipMatch[1], 10);
    raw = raw.slice(0, skipMatch.index).trim();
  }

  const [mob, time] = parseArguments(raw);
  const args = new Map<string, string | number | null>([
    ["mob", mob],
    ["time", time],
    ["skip_count", skipCount],
  ]);
  return new PrefixInteractionAdapter(message, args);
}
