import { uniqBy } from "lodash";

export interface PilotCredit {
  bot: string;
  pilot: string;
}

export interface PilotLookups {
  characterExists: (name: string) => Promise<boolean>;
  getCurrentBotPilot: (bot: string) => Promise<string | undefined>;
}

/**
 * Flags botpilot tells whose pilot looks wrong, so deputies can fix them before
 * approving the !rep: a pilot name that isn't a known character (usually a typo),
 * or a public bot that the bot sheet says someone else has checked out.
 * Lookup failures are ignored; these are hints, not blockers.
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
      const current = await lookups
        .getCurrentBotPilot(bot)
        .catch(() => undefined);
      if (current && current.toLowerCase() !== pilot.toLowerCase()) {
        return `⚠️ ${said}, but the bot sheet has ${bot} checked out to ${current}`;
      }
    })
  );
  return warnings.filter((w): w is string => !!w);
};
