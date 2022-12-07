import {
  ancientBloodRoleId,
  blackLotusRoleId,
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
  GreenBlackLotus = "🎴",
  GreenAncientBlood = "🦎",
  BlueCastle = "☑️",
  BlueCalvary = "🐴",
  Interview = "❔",
  InterviewAlt = "❓",
  Instruct = "❗",
  InstructAlt = "❕",
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

// todo: refactor this to more generically associate an emoji with an action
const GreenTagAction: ReactionConfig = {
  roles: [garrisonRoleId, greenRoleId],
  action: ActionType.Tag,
};

const GreenAncientBloodTagAction: ReactionConfig = {
  roles: [visitorRoleId, greenRoleId, ancientBloodRoleId],
  action: ActionType.Tag,
};

const GreenFreyasCharriotTagAction: ReactionConfig = {
  roles: [visitorRoleId, greenRoleId, freyasChariotRoleId],
  action: ActionType.Tag,
};

const GreenBlackLotusTagAction: ReactionConfig = {
  roles: [visitorRoleId, greenRoleId, blackLotusRoleId],
  action: ActionType.Tag,
};

const BlueTagAction: ReactionConfig = {
  roles: [garrisonRoleId, blueRoleId],
  action: ActionType.Tag,
};

const BlueCalvaryTagAction: ReactionConfig = {
  roles: [visitorRoleId, calvaryRoleId],
  action: ActionType.Tag,
};

const InstructAction: ReactionConfig = {
  roles: [],
  action: ActionType.Instruct,
};

const InterviewAction: ReactionConfig = {
  roles: [],
  action: ActionType.Interview,
};

export const actionConfigByReaction: { [emoji: string]: ReactionConfig } = {
  [Emoji.GreenCastle]: GreenTagAction,
  [Emoji.GreenAncientBlood]: GreenAncientBloodTagAction,
  [Emoji.GreenFreyasChariot]: GreenFreyasCharriotTagAction,
  [Emoji.GreenBlackLotus]: GreenBlackLotusTagAction,
  [Emoji.BlueCastle]: BlueTagAction,
  [Emoji.BlueCalvary]: BlueCalvaryTagAction,
  [Emoji.Instruct]: InstructAction,
  [Emoji.InstructAlt]: InstructAction,
  [Emoji.Interview]: InterviewAction,
  [Emoji.InterviewAlt]: InterviewAction,
};
