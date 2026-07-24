/**
 * Pure batphone-matching logic for EQNotify, kept free of side-effectful
 * imports (Discord client, Prisma) so it can be unit tested in isolation.
 */

/**
 * Default raid targets a newly enrolled subscriber is notified for. They can be
 * customized afterwards with the add-tag / remove-tag / clear-tags subcommands.
 */
export const DEFAULT_TAGS = [
  "dain",
  "quake",
  "vulak",
  "kt",
  "tormax",
  "doze",
  "statue",
  "ct",
  "cazic",
];

/**
 * A batphone whose content includes any of these terms is treated as a
 * buff/last-hour-RTE call and never triggers notifications.
 */
export const FILTERED_TERMS = ["buff", "rte"];

/**
 * Special tag that opts a subscriber into every (unfiltered) batphone.
 */
export const ALL_TAG = "all";

export const normalizeTag = (tag: string) => tag.trim().toLowerCase();

/**
 * Whether a batphone should be suppressed (buff / last-hour RTE calls).
 */
export const isFiltered = (content: string) => {
  const lower = content.toLowerCase();
  return FILTERED_TERMS.some((term) => lower.includes(term));
};

/**
 * Whether a batphone matches any of a subscriber's tags. The special `all` tag
 * matches every (unfiltered) batphone; otherwise tags are substring-matched
 * against the lowercased content.
 */
export const matchesTags = (content: string, tags: string[]) => {
  if (tags.includes(ALL_TAG)) {
    return true;
  }
  const lower = content.toLowerCase();
  return tags.some((tag) => Boolean(tag) && lower.includes(tag));
};
