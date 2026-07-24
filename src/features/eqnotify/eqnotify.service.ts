import { eqnotify_subscriber, eqnotify_type } from "@prisma/client";
import { prismaClient } from "../..";
import { log } from "../../shared/logger";
import { notify } from "./notifiers";
import {
  DEFAULT_TAGS,
  isFiltered,
  matchesTags,
  normalizeTag,
} from "./matcher";

export { DEFAULT_TAGS } from "./matcher";

interface EnrollInput {
  discordId: string;
  discordUsername: string;
  contact: string;
  type: eqnotify_type;
}

const requireSubscriber = async (discordId: string) => {
  const subscriber = await prismaClient.eqnotify_subscriber.findUnique({
    where: { discordId },
  });
  if (!subscriber) {
    throw new Error(
      "You are not enrolled in EQNotify. Use `/eqnotify register` to set up notifications."
    );
  }
  return subscriber;
};

export const eqnotifyService = {
  getSubscriber: (discordId: string) =>
    prismaClient.eqnotify_subscriber.findUnique({ where: { discordId } }),

  requireSubscriber,

  /**
   * Creates a subscriber, or updates their contact/type if they already exist.
   * Existing tags are preserved; new subscribers start with the defaults.
   */
  enroll: async ({ discordId, discordUsername, contact, type }: EnrollInput) =>
    prismaClient.eqnotify_subscriber.upsert({
      where: { discordId },
      update: { discordUsername, contact, type },
      create: {
        discordId,
        discordUsername,
        contact,
        type,
        tags: DEFAULT_TAGS,
      },
    }),

  remove: (discordId: string) =>
    prismaClient.eqnotify_subscriber.delete({ where: { discordId } }),

  addTag: async (discordId: string, rawTag: string) => {
    const subscriber = await requireSubscriber(discordId);
    const tag = normalizeTag(rawTag);
    if (!tag) {
      throw new Error("Tag cannot be empty.");
    }
    if (subscriber.tags.includes(tag)) {
      throw new Error(`\`${tag}\` is already in your notification tags.`);
    }
    await prismaClient.eqnotify_subscriber.update({
      where: { discordId },
      data: { tags: { push: tag } },
    });
    return tag;
  },

  removeTag: async (discordId: string, rawTag: string) => {
    const subscriber = await requireSubscriber(discordId);
    const tag = normalizeTag(rawTag);
    if (!subscriber.tags.includes(tag)) {
      throw new Error(`\`${tag}\` is not in your notification tags.`);
    }
    await prismaClient.eqnotify_subscriber.update({
      where: { discordId },
      data: { tags: subscriber.tags.filter((t) => t !== tag) },
    });
    return tag;
  },

  clearTags: async (discordId: string) => {
    await requireSubscriber(discordId);
    await prismaClient.eqnotify_subscriber.update({
      where: { discordId },
      data: { tags: [] },
    });
  },

  /**
   * Matches a batphone against every subscriber's tags and delivers alerts.
   * Delivery failures are logged but never interrupt other subscribers.
   */
  dispatch: async (content: string) => {
    if (!content.trim() || isFiltered(content)) {
      return;
    }
    const subscribers = await prismaClient.eqnotify_subscriber.findMany();
    await Promise.all(
      subscribers
        .filter((sub) => matchesTags(content, sub.tags))
        .map((sub) => eqnotifyService.notifySubscriber(sub, content))
    );
  },

  notifySubscriber: async (
    subscriber: eqnotify_subscriber,
    message: string
  ) => {
    try {
      log(
        `EQNotify alert -> ${subscriber.discordUsername} (${subscriber.type})`
      );
      await notify(subscriber, message);
    } catch (error) {
      log(
        `EQNotify delivery failed for ${subscriber.discordUsername}: ${error}`
      );
    }
  },
};
