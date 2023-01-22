import {
  ancientBloodRoleId,
  blackLotusRoleId,
  freyasChariotRoleId,
  castleRoleId,
  membersAndAlliesRoleId,
  competitorRoleId,
  akatsukiRoleId,
} from "../../config";

export enum Emoji {
  Castle = "✅",
  CastleAlt1 = "🏰",
  CastleAlt2 = "🏯",
  FreyasChariot = "🏹",
  BlackLotus = "🎴",
  AncientBlood = "🦎",
  Akatsuki = "☀️",
  Competitor = "🏁",
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
const CastleTagAction: ReactionConfig = {
  roles: [castleRoleId, membersAndAlliesRoleId],
  action: ActionType.Tag,
};

const AncientBloodTagAction: ReactionConfig = {
  roles: [membersAndAlliesRoleId, ancientBloodRoleId],
  action: ActionType.Tag,
};

const FreyasCharriotTagAction: ReactionConfig = {
  roles: [membersAndAlliesRoleId, freyasChariotRoleId],
  action: ActionType.Tag,
};

const BlackLotusTagAction: ReactionConfig = {
  roles: [membersAndAlliesRoleId, blackLotusRoleId],
  action: ActionType.Tag,
};

const AkatsukiTagAction: ReactionConfig = {
  roles: [membersAndAlliesRoleId, akatsukiRoleId],
  action: ActionType.Tag,
};

const CompetitorTagAction: ReactionConfig = {
  roles: [membersAndAlliesRoleId, competitorRoleId],
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
  [Emoji.Castle]: CastleTagAction,
  [Emoji.CastleAlt1]: CastleTagAction,
  [Emoji.CastleAlt2]: CastleTagAction,
  [Emoji.AncientBlood]: AncientBloodTagAction,
  [Emoji.FreyasChariot]: FreyasCharriotTagAction,
  [Emoji.BlackLotus]: BlackLotusTagAction,
  [Emoji.Akatsuki]: AkatsukiTagAction,
  [Emoji.Competitor]: CompetitorTagAction,
  [Emoji.Instruct]: InstructAction,
  [Emoji.InstructAlt]: InstructAction,
  [Emoji.Interview]: InterviewAction,
  [Emoji.InterviewAlt]: InterviewAction,
};
