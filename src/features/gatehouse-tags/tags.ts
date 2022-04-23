import {
  ancientBloodRoleId,
  blueRoleId,
  calvaryRoleId,
  freyasChariotRoleId,
  garrisonRoleId,
  greenRoleId,
  visitorRoleId,
} from "../../config";

export enum TagReaction {
  GreenCastle = "✅",
  GreenFreyasChariot = "🏹",
  GreenAncientBlood = "🦎",
  BlueCastle = "☑️",
  BlueCalvary = "🐴",
}

export const roleIdsByTag = {
  [TagReaction.GreenCastle]: [garrisonRoleId, greenRoleId],
  [TagReaction.GreenAncientBlood]: [
    visitorRoleId,
    greenRoleId,
    ancientBloodRoleId,
  ],
  [TagReaction.GreenFreyasChariot]: [
    visitorRoleId,
    greenRoleId,
    freyasChariotRoleId,
  ],
  [TagReaction.BlueCastle]: [garrisonRoleId, blueRoleId],
  [TagReaction.BlueCalvary]: [visitorRoleId, blueRoleId, calvaryRoleId],
};
