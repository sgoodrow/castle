import { eqnotify_subscriber, eqnotify_type } from "@prisma/client";
import { getMember, prismaClient } from "../..";
import { raiderRoleId } from "../../config";
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

/**
 * Whether a member currently holds the Raider role. Batphone alerts are only
 * delivered to active Raiders, so a subscriber who loses the role (goes
 * inactive, leaves the guild, etc.) stops receiving alerts without having to
 * unregister. Failures to resolve the member are treated as "not a Raider".
 */
const hasRaiderRole = async (discordId: string): Promise<boolean> => {
  try {
    const member = await getMember(discordId);
    return member.roles.cache.has(raiderRoleId);
  } catch (error) {
    log(
      `EQNotify could not resolve member ${discordId} for role check: ${error}`
    );
    return false;
  }
};

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

  listSubscribers: () =>
    prismaClient.eqnotify_subscriber.findMany({
      orderBy: { discordUsername: "asc" },
    }),

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
   * Only subscribers who currently hold the Raider role are notified. Delivery
   * failures are logged but never interrupt other subscribers.
   */
  dispatch: async (content: string) => {
    if (!content.trim() || isFiltered(content)) {
      return;
    }
    const subscribers = await prismaClient.eqnotify_subscriber.findMany();
    await Promise.all(
      subscribers
        .filter((sub) => matchesTags(content, sub.tags))
        .map(async (sub) => {
          if (!(await hasRaiderRole(sub.discordId))) {
            return;
          }
          await eqnotifyService.notifySubscriber(sub, content);
        })
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
