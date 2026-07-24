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
  "earthquake",
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
 * Escapes a string for safe use as a literal inside a RegExp.
 */
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether a single tag matches the (lowercased) content. A tag matches when it
 * appears at the *start of a word* — i.e. some whitespace/punctuation-delimited
 * token begins with the tag.
 *
 * This keeps intentional abbreviation/prefix triggers working (`doze` matches
 * "Dozekar", `cazic` matches "Cazic-Thule", `vulak` matches "Vulak`Aerr") while
 * preventing short tags from matching mid-word: `ct` matches "CT CT POP" but no
 * longer matches "contact" or "protect". The tag itself may contain punctuation.
 */
const tagMatchesContent = (lowerContent: string, tag: string) => {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(tag)}`);
  return pattern.test(lowerContent);
};

/**
 * Whether a batphone should be suppressed (buff / last-hour RTE calls).
 */
export const isFiltered = (content: string) => {
  const lower = content.toLowerCase();
  return FILTERED_TERMS.some((term) => lower.includes(term));
};

/**
 * Whether a batphone matches any of a subscriber's tags. The special `all` tag
 * matches every (unfiltered) batphone; otherwise a tag matches when a word in
 * the content begins with the tag (see {@link tagMatchesContent}).
 */
export const matchesTags = (content: string, tags: string[]) => {
  if (tags.includes(ALL_TAG)) {
    return true;
  }
  const lower = content.toLowerCase();
  return tags.some((tag) => Boolean(tag) && tagMatchesContent(lower, tag));
};
