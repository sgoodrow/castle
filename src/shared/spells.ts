import { mapFromData } from "./items";
import spellsData from "@resources/spells.json";

export const spellsMap = mapFromData(spellsData, "Spell ");
