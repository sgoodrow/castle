export enum Class {
  Enchanter = "Enchanter",
  Mage = "Mage",
  Necromancer = "Necromancer",
  Wizard = "Wizard",
  Cleric = "Cleric",
  Druid = "Druid",
  Shaman = "Shaman",
  Bard = "Bard",
  Monk = "Monk",
  Ranger = "Ranger",
  Rogue = "Rogue",
  Paladin = "Paladin",
  Shadowknight = "Shadowknight",
  Warrior = "Warrior",
}

export const classes = Object.keys(Class);

export const getClassAbreviation = (role?: string) => {
  switch (role) {
    case Class.Enchanter:
      return "ENC";
    case Class.Mage:
      return "MAG";
    case Class.Necromancer:
      return "NEC";
    case Class.Wizard:
      return "WIZ";
    case Class.Cleric:
      return "CLR";
    case Class.Druid:
      return "DRU";
    case Class.Shaman:
      return "SHM";
    case Class.Bard:
      return "BRD";
    case Class.Monk:
      return "MNK";
    case Class.Ranger:
      return "RNG";
    case Class.Rogue:
      return "ROG";
    case Class.Paladin:
      return "PAL";
    case Class.Shadowknight:
      return "SHD";
    case Class.Warrior:
      return "WAR";
    default:
      throw new Error(`Invalid class (${role} not recognized)`);
  }
};
