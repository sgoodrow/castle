import { mapFromData } from "./items";
import spellsData from "src/resources/spells.json";

export const spellsMap = mapFromData(spellsData, "Spell ");
