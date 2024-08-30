import { RequestApplication } from "./request-application-button-commands";

const officerApplicationCommand = new RequestApplication(
  "Officer",
  "running the guild"
);

const guardApplicationCommand = new RequestApplication(
  "Guard",
  "conducting guild invites, keeping the peace, and optionally running non-raid events"
);

const knightApplicationCommand = new RequestApplication(
  "Knight",
  "running, scheduling and supporting guild raids"
);

const bankerApplicationCommand = new RequestApplication(
  "Banker",
  "fielding bank requests"
);

const jewelerApplicationCommand = new RequestApplication(
  "Jeweler",
  "fielding jewelry requests"
);

const scribeApplicationCommand = new RequestApplication(
  "Scribe",
  "ensuring our guild policies and documentation are accurate and accessible"
);

const dkpDeputyApplicationCommand = new RequestApplication(
  "DKP Deputy",
  "uploading DKP records and resolving record inaccuracies"
);

const quarterMasterApplicationCommand = new RequestApplication(
  "Quarter Master",
  "restocking and recharging shared bot characters"
);

const otherApplicationCommand = new RequestApplication(
  "Other",
  "doing things we did not anticipate"
);

export const castleOnlyRoles = [
  officerApplicationCommand,
  guardApplicationCommand,
];

export const castleOrAllyRoles = [
  knightApplicationCommand,
  scribeApplicationCommand,
  dkpDeputyApplicationCommand,
  bankerApplicationCommand,
  jewelerApplicationCommand,
  quarterMasterApplicationCommand,
  otherApplicationCommand,
];

export const applicationCommands = [...castleOnlyRoles, ...castleOrAllyRoles];
