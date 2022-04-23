import {
  ancientBloodRoleId,
  blueRoleId,
  calvaryRoleId,
  freyasChariotRoleId,
  garrisonRoleId,
  greenRoleId,
  visitorRoleId,
} from "../../config";

export enum Emoji {
  GreenCastle = "✅",
  GreenFreyasChariot = "🏹",
  GreenAncientBlood = "🦎",
  BlueCastle = "☑️",
  BlueCalvary = "🐴",
  Interview = "❔",
  Instruct = "❗",
}

export enum ActionType {
  Instruct = "instruct",
  Interview = "interview",
  Tag = "tag",
}

interface ReactionConfig {
  roles: string[];
  action: ActionType;
}

export const actionConfigByReaction: { [emoji: string]: ReactionConfig } = {
  [Emoji.GreenCastle]: {
    roles: [garrisonRoleId, greenRoleId],
    action: ActionType.Tag,
  },
  [Emoji.GreenAncientBlood]: {
    roles: [visitorRoleId, greenRoleId, ancientBloodRoleId],
    action: ActionType.Tag,
  },
  [Emoji.GreenFreyasChariot]: {
    roles: [visitorRoleId, greenRoleId, freyasChariotRoleId],
    action: ActionType.Tag,
  },
  [Emoji.BlueCastle]: {
    roles: [garrisonRoleId, blueRoleId],
    action: ActionType.Tag,
  },
  [Emoji.BlueCalvary]: {
    roles: [visitorRoleId, blueRoleId, calvaryRoleId],
    action: ActionType.Tag,
  },
  [Emoji.Instruct]: {
    roles: [],
    action: ActionType.Instruct,
  },
  [Emoji.Interview]: {
    roles: [],
    action: ActionType.Interview,
  },
};
