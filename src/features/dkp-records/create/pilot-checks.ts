import { uniqBy } from "lodash";

export interface PilotCredit {
  bot: string;
  pilot: string;
}

export interface PilotLookups {
  characterExists: (name: string) => Promise<boolean>;
}

/**
 * Flags botpilot tells naming a character OpenDKP doesn't know (usually a typo),
 * so deputies can fix them before approving the !rep. Lookup failures are ignored;
 * these are hints, not blockers.
 *
 * This deliberately doesn't compare against the bot sheet's current pilot: that's a
 * Discord nickname, which needn't match any character name.
 */
export const getPilotWarnings = async (
  credits: PilotCredit[],
  lookups: PilotLookups
): Promise<string[]> => {
  const unique = uniqBy(
    credits,
    ({ bot, pilot }) => `${bot.toLowerCase()} ${pilot.toLowerCase()}`
  );
  const warnings = await Promise.all(
    unique.map(async ({ bot, pilot }) => {
      const said = `${bot} said botpilot ${pilot}`;
      const exists = await lookups
        .characterExists(pilot)
        .catch(() => true);
      if (!exists) {
        return `⚠️ ${said}, but there is no character named ${pilot} in OpenDKP`;
      }
    })
  );
  return warnings.filter((w): w is string => !!w);
};
