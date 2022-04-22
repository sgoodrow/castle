import { replaceAll } from "./string-util";

const encode = (name: string) =>
  replaceAll(replaceAll(name, " ", "_"), "'", "%60");

const forClass = (
  className: string,
  ...spells: { name: string; level: number }[]
) =>
  spells.map(({ name, level }) => ({
    name,
    level,
    className,
    url: `https://wiki.project1999.com/${encode(name)}`,
  }));

export const ForbiddenSpells = [
  ...forClass(
    "Mage",
    { name: "Call of the Hero", level: 55 },
    { name: "Burnout IV", level: 55 },
    { name: "Muzzle of Mardu", level: 56 },
    { name: "Greater Vocaration: Water", level: 60 }
  ),
  ...forClass(
    "Necromancer",
    { name: "Augmentation of Death", level: 55 },
    { name: "Servant of Bones", level: 56 },
    { name: "Sedulous Subversion", level: 56 },
    { name: "Emissary of Thule", level: 59 },
    { name: "Demi Lich", level: 60 },
    { name: "Minion of Shadows", level: 53 }
  ),
  ...forClass(
    "Wizard",
    { name: "Ice Spear of Solist", level: 60 },
    { name: "Lure of Ice", level: 60 },
    { name: "Sunstrike", level: 60 }
  ),
  ...forClass(
    "Enchanter",
    { name: "Zumaik's Animation", level: 55 },
    { name: "Forlorn Deeds", level: 57 },
    { name: "Bedlam", level: 58 },
    { name: "Gift of Pure Thought", level: 59 },
    { name: "Dictate", level: 60 },
    { name: "Visions of Grandeur", level: 60 },
    { name: "Gift of Brilliance", level: 60 }
  ),
  ...forClass(
    "Shaman",
    { name: "Form of the Great Bear", level: 55 },
    { name: "Spirit of the Howler", level: 55 },
    { name: "Bane of Nife", level: 56 },
    { name: "Cannibalize IV", level: 58 },
    { name: "Pox of Bertoxxulous", level: 59 },
    { name: "Avatar", level: 60 },
    { name: "Focus of Spirit", level: 60 },
    { name: "Malo", level: 60 },
    { name: "Torpor", level: 60 }
  ),
  ...forClass(
    "Druid",
    { name: "Nature Walkers Behest", level: 55 },
    { name: "Regrowth of the Grove", level: 58 },
    { name: "Legacy of Thorn", level: 59 },
    { name: "Entrapping Roots", level: 60 },
    { name: "Form of the Hunter", level: 60 },
    { name: "Mask of the Hunter", level: 60 },
    { name: "Protection of the Glades", level: 60 }
  ),
  ...forClass(
    "Cleric",
    { name: "Mark of Karn", level: 56 },
    { name: "Naltron's Mark", level: 58 },
    { name: "Aegolism", level: 60 },
    { name: "Word of Redemption", level: 60 },
    { name: "Divine Intervention", level: 60 }
  ),
];
