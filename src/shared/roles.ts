export const getClassAbreviation = (role?: string) => {
  switch (role) {
    case "Enchanter":
      return "ENC";
    case "Mage":
      return "MAG";
    case "Necromancer":
      return "NEC";
    case "Wizard":
      return "WIZ";
    case "Cleric":
      return "CLR";
    case "Druid":
      return "DRU";
    case "Shaman":
      return "SHM";
    case "Bard":
      return "BRD";
    case "Monk":
      return "MNK";
    case "Ranger":
      return "RNG";
    case "Rogue":
      return "ROG";
    case "Paladin":
      return "PAL";
    case "Shadowknight":
      return "SHD";
    case "Warrior":
      return "WAR";
    default:
      throw new Error(`Invalid class (${role} not recognized)`);
  }
};
