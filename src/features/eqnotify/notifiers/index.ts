import { eqnotify_subscriber, eqnotify_type } from "@prisma/client";
import { wirePush } from "./wirepusher";
import { telegramPush } from "./telegram";

/**
 * Delivers an EQNotify alert to a subscriber using their configured channel.
 */
export const notify = async (
  subscriber: Pick<eqnotify_subscriber, "contact" | "type">,
  message: string
) => {
  switch (subscriber.type) {
    case eqnotify_type.wire:
      return wirePush(subscriber.contact, message);
    case eqnotify_type.telegram:
      return telegramPush(subscriber.contact, message);
    default:
      throw new Error(`Unknown EQNotify delivery type: ${subscriber.type}`);
  }
};
