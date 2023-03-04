import { Message, PartialMessage } from "discord.js";
import { dkpRecordsChannelId } from "../../../config";
import { AddAction } from "./add-action";
import { ReplaceAction } from "./replace-action";
import { RemoveAction } from "./remove-action";

const multipleSpaces = /\s+/;

export const getRaidEditMessageContent = async (
  message: Message | PartialMessage
) => {
  if (
    message.channel.isThread() &&
    message.channel.parentId !== dkpRecordsChannelId
  ) {
    return;
  }

  const { content } = await message.fetch();

  if (!content.startsWith("!")) {
    return;
  }

  return content;
};

export const getAction = (content: string) => {
  const [actionType, ...actionArguments] = content
    .slice(1)
    .split(multipleSpaces);

  switch (actionType) {
    case "add":
      return new AddAction(actionArguments);
    case "rem":
      return new RemoveAction(actionArguments);
    case "rep":
      return new ReplaceAction(actionArguments);
    default:
      throw new Error(
        `Could not verify raid edit because the action "${actionType}" is not supported.`
      );
  }
};
