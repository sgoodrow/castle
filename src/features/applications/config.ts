import { RequestApplication } from "./request-application-button-commands";

const officerApplicationCommand = new RequestApplication(
  "Officer",
  "running the guild",
  "any officer",
  [
    "Please describe what motivates you to volunteer as an officer.",
    "Officers must set a shining example for the other members of the guild. This may include moderating our typical habits of speech in guild chat, and refraining from trash-talking even when others are rude. Furthermore, we must know the server rules inside and out, and follow them. Our behavior reflects directly upon Castle itself. Are you willing to hold yourself to the highest standards of decorum even during emotional times and to take responsibility for the consequences of your decisions as an officer?",
    "While we are allowed to play the game and not be on-duty all the time, being an Officer will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being an Officer of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?",
    "The complaints and reports we receive are sometimes genuine, but sometimes frivolous or false. We need people who will endure the discomfort of dealing diplomatically with reports and be willing to have honest talks with members, mostly 30-to-60-year-old adults, about their misbehavior in a video game. Do you have the maturity to maintain your composure and behave professionally?",
  ],
  "current officers. Each applicant must be approved by 3 current officers and not be opposed by any"
);

const guardApplicationCommand = new RequestApplication(
  "Guard",
  "conducting guild invites, keeping the peace, and optionally running non-raid events",
  "any officer",
  [
    "Please describe what motivates you to volunteer as a Guard.",
    "Guards must set a shining example of the guild while interacting with prospective recruits. Are you willing to hold yourself to the highest standards of decorum while representing Castle to new members?",
    "While we should play the game and not be on-duty all the time, being a Guard will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being a Guard of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?",
  ],
  "current officers, and approved by the Castle Captain of the Guard"
);

const knightApplicationCommand = new RequestApplication(
  "Knight",
  "running, scheduling and supporting guild raids",
  "any officer",
  [
    "Please describe what motivates you to volunteer as a Knight. Which aspects of being raid leadership, support and preparation are you interested in or willing to help with?",
    "Knights must set a shining example of the guild while interacting with raiders. Are you willing to hold yourself to the highest standards of decorum while representing Castle to new members?",
    "While we should play the game and not be on-duty all the time, being a Knight will indeed consume some of one's game time. Are you willing to dedicate some of your game time to being a Knight of Castle? And do you have the wisdom to set aside time for yourself to enjoy the game?",
  ],
  "current knights and officers, and approved by the Castle Knight Commander"
);

const bankerApplicationCommand = new RequestApplication(
  "Banker",
  "fielding bank requests",
  "any officer",
  [
    "Banking requires you to perform recordkeeping in various places including google docs and discord threads. Are you willing to dedicate some of your game time to running the guild bank? And do you have the wisdom to set aside time for yourself to enjoy the game?",
    "Banking requires patience and attention to detail. Are you capable of being patient and performing all aspects of banking tasks?",
    "How would you respond to a request by an individual who is not in zone when you log in to fullfill their request?",
  ],
  "current officers, and approved by the Castle Treasurer"
);

const jewelerApplicationCommand = new RequestApplication(
  "Jeweler",
  "fielding jewelry requests",
  "any officer",
  [
    "Jewlery crafting requires you to perform recordkeeping in various places including google docs and discord threads. Are you willing to dedicate some of your game time to being a guild jewelers? And do you have the wisdom to set aside time for yourself to enjoy the game?",
    "Jewlery crafting requires patience and attention to detail. Are you capable of being patient and performing all aspects of jewelry crafting tasks?",
    "How would you respond to a request by an individual who is not in zone when you log in to fullfill their request?",
  ],
  "current officers, and approved by the Castle Treasurer"
);

const scribeApplicationCommand = new RequestApplication(
  "Scribe",
  "ensuring our guild policies and documentation are accurate and accessible",
  "any officer",
  [],
  "current scribes and officers, and approved by the Castle Chief of Staff"
);

const dkpDeputyApplicationCommand = new RequestApplication(
  "DKP Deputy",
  "uploading DKP records and resolving record inaccuracies",
  "any officer",
  [],
  "current officers, and approved by the Castle Chief of Staff"
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
