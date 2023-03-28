import { Message, PartialMessage } from "discord.js";
import { dkpBonusesChannelId } from "../../../config";
import { AddAdjustmentBonus } from "./add-adjustment-bonus";

const multipleSpaces = /\s+/;

export const getBonusMessageContent = async (
  message: Message | PartialMessage
) => {
  const thread = message.channel.isThread();
  if (!thread) {
    return;
  }
  if (message.channel.parentId !== dkpBonusesChannelId) {
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
    case "adj":
      return new AddAdjustmentBonus(actionArguments);
    default:
      throw new Error(
        `Could not verify raid bonus because the action "${actionType}" is not supported.`
      );
  }
};
