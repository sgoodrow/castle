import { RequestApplication } from "./request-application-button-commands";

const officerApplicationCommand = new RequestApplication(
  "Officer",
  "running the guild",
  "https://docs.google.com/forms/d/e/1FAIpQLScXY1H7TUMQ_XKxueILsUXIxGFFP_GGK5ICNu_IN_WFXjltrg/viewform",
  "current officers. Each applicant must be approved by >60% of active officers, >60% of the Guild Management Team, or by the guild leader. This process typically takes less than a week"
);

const guardApplicationCommand = new RequestApplication(
  "Guard",
  "conducting guild invites, keeping the peace, and optionally running non-raid events",
  "https://docs.google.com/forms/d/e/1FAIpQLScI4sJiXnQPQT9buyC3kAOwcR-b4zao2Jre53ev37ubCfaKwA/viewform?usp=sf_link",
  "current officers and approved by the Captain of the Guard"
);

const knightApplicationCommand = new RequestApplication(
  "Knight",
  "running, scheduling and supporting guild raids",
  "https://docs.google.com/forms/d/e/1FAIpQLScDdkDI5EzthiQA96pRFxExeuGnmUyGM9blA-By_tlebTscfA/viewform?usp=sf_link",
  "current officers and approved by the Knight Commander"
);

const bankerApplicationCommand = new RequestApplication(
  "Banker",
  "fielding bank requests",
  "https://docs.google.com/forms/d/e/1FAIpQLSfQh6ZHzTI3GCEFLY7prJlGL-p0bq9n6aVlmsi-VyGuB2nhlg/viewform?usp=sf_link",
  "current officers and approved by the Bank Czar"
);

const jewelerApplicationCommand = new RequestApplication(
  "Jeweler",
  "fielding jewelry requests",
  "https://docs.google.com/forms/d/e/1FAIpQLSdqlvTxlZpcsNinYxWywL8H6NZ6wm04sG97pOa8MZdMGaahdg/viewform?usp=sf_link",
  "current officers and approved by the Bank Czar"
);

const scribeApplicationCommand = new RequestApplication(
  "Scribe",
  "ensuring our guild policies and documentation are accurate and accessible",
  "https://docs.google.com/forms/d/e/1FAIpQLSd4eJkBBLpBbvCFRVEcnvUmzePbk9cg8Isfl1xoxWASWt6eLA/viewform?usp=sf_link",
  "current officers and approved by the Chief of Staff"
);

const dkpDeputyApplicationCommand = new RequestApplication(
  "DKP Deputy",
  "uploading DKP records and resolving record inaccuracies",
  "https://docs.google.com/forms/d/e/1FAIpQLSf4rdHPjl0QzDOCl3v_DJOQHvqEAU45BwZs68ImFwf1NzJKWw/viewform?usp=sf_link",
  "current officers and approved by the Chief of Staff"
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
];

export const applicationCommands = [...castleOnlyRoles, ...castleOrAllyRoles];
