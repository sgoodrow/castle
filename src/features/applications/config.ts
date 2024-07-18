import { RequestApplication } from "./request-application-button-commands";

const officerApplicationCommand = new RequestApplication(
  "Officer",
  "running the guild",
  "any officer",
  [
    "Please elaborate on the specific factors that drive your interest in volunteering as an officer. What personal motivations or experiences have influenced your decision to take on this role? Additionally, can you describe the particular areas or aspects of the guild where you believe you could make the most significant contribution as an officer? How do you envision your role enhancing the guild's overall experience and success?",
    "Officers are expected to set a strong example for the rest of the guild, including moderating our language in guild chat and avoiding any form of trash-talking, even in response to rudeness from others. You must be well-versed in the server rules and consistently adhere to them. Can you elaborate on how you plan to uphold these standards of decorum and take responsibility for the impact of your actions as an officer? How would you handle a situation where your decisions might reflect poorly on the guild?",
    "While it’s understood that officers are not required to be on-duty at all times, the role will inevitably require a significant time commitment. Could you describe how you intend to balance your responsibilities as an officer with your personal time and enjoyment of the game? How do you plan to manage your time effectively to ensure you can fulfill your officer duties without compromising your own gaming experience?",
    "Handling complaints and reports involves navigating both genuine concerns and potentially frivolous or false claims. This role requires dealing diplomatically with reports and engaging in honest discussions with members, many of whom are adults aged 30 to 60, about their behavior. Can you provide examples or describe situations where you’ve demonstrated the maturity and professionalism required for this task? How would you approach a situation where you need to address serious behavioral issues diplomatically?",
    "Please provide a detailed list of all your characters that are tagged in the alliance. After completing this application and compiling your character list, please send it via direct message to an officer.",
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
    "Please include a list with the name, class and level of all of your characters that are tagged in the alliance. Once you have filled out this application and created the list please DM this to an officer.",
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
    "Once you have filled out this application, please DM this to an officer.",
  ],
  "the current Knight Commander and a conversation ensues regarding what you want to support. Then, current officers vote, and the application is approved by the Castle Knight Commander"
);

const bankerApplicationCommand = new RequestApplication(
  "Banker",
  "fielding bank requests",
  "any officer",
  [
    "Banking requires you to perform recordkeeping in various places including google docs and discord threads. Are you willing to dedicate some of your game time to running the guild bank? And do you have the wisdom to set aside time for yourself to enjoy the game?",
    "Banking requires patience and attention to detail. Are you capable of being patient and performing all aspects of banking tasks?",
    "How would you respond to a request by an individual who is not in zone when you log in to fullfill their request?",
    "Once you have filled out this application, please DM this to an officer.",
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
    "Once you have filled out this application, please DM this to an officer.",
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
