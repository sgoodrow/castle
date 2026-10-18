import { Message, PartialMessage } from "discord.js";
import { dkpRecordsChannelId } from "../../../config";
import { AddPlayerRevision } from "./add-player-revision";
import { ReplacePlayerRevision } from "./replace-player-revision";
import { RemovePlayerRevision } from "./remove-player-revision";
import { AddAdjustmentRevision } from "./add-adjustment-revision";

const multipleSpaces = /\s+/;

export const getRaidRevisionMessageContent = async (
  message: Message | PartialMessage
) => {
  if (!message) {
    throw new Error(
      "Tried to get raid revision message content but the message was undefined. Fetch?"
    );
  }
  const thread = message.channel.isThread();
  if (!thread) {
    return;
  }
  if (message.channel.parentId !== dkpRecordsChannelId) {
    return;
  }

  const { content } = await message.fetch();
  if (!content.startsWith("!")) {
    return;
  }

  return content;
};

export const getAction = (content: string) => {
  // remove parenthetical expressions
  const stripped = content.replace(/\(.+?\)/g, "").trim();

  const [actionType, ...actionArguments] = stripped
    .slice(1)
    .split(multipleSpaces);

  switch (actionType.toLowerCase()) {
    case "add":
      return new AddPlayerRevision(actionArguments);
    case "rem":
      return new RemovePlayerRevision(actionArguments);
    case "rep":
      return new ReplacePlayerRevision(actionArguments);
    case "adj":
      return new AddAdjustmentRevision(actionArguments);
    default:
      throw new Error(
        `Could not verify raid edit because the action "${actionType}" is not supported.`
      );
  }
};
