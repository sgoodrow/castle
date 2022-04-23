enum Classes {
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

export const classes = Object.keys(Classes);

export const getClassAbreviation = (role?: string) => {
  switch (role) {
    case Classes.Enchanter:
      return "ENC";
    case Classes.Mage:
      return "MAG";
    case Classes.Necromancer:
      return "NEC";
    case Classes.Wizard:
      return "WIZ";
    case Classes.Cleric:
      return "CLR";
    case Classes.Druid:
      return "DRU";
    case Classes.Shaman:
      return "SHM";
    case Classes.Bard:
      return "BRD";
    case Classes.Monk:
      return "MNK";
    case Classes.Ranger:
      return "RNG";
    case Classes.Rogue:
      return "ROG";
    case Classes.Paladin:
      return "PAL";
    case Classes.Shadowknight:
      return "SHD";
    case Classes.Warrior:
      return "WAR";
    default:
      throw new Error(`Invalid class (${role} not recognized)`);
  }
};
