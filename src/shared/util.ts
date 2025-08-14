import { truncate } from "lodash";
import * as fs from "fs";
import * as readline from "readline";
import { Readable } from "stream"; // Node's Readable

export const code = "```";

const NEWLINES = /[\r\n]+/g;

export const compactDescription = (description: string, length?: number) => {
  const oneLine = description.replace(NEWLINES, " ");
  if (!length) {
    return oneLine;
  }
  return truncate(oneLine, {
    length,
  });
};

export const capitalize = (text: string): string => {
  return text.toLowerCase().charAt(0).toUpperCase() + text.slice(1);
};

export const processTsvFileWithHeaders = async (
  filePath: string,
  onRow: (row: RowObject) => void
): Promise<void> => {
  const fileStream: Readable = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream, // fs.ReadStream, not web ReadableStream
    crlfDelay: Infinity,
  });

  let headers: string[] | null = null;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const columns = line.split("\t");

    if (!headers) {
      headers = columns;
      continue;
    }

    const rowObj: RowObject = {};
    headers.forEach((header, i) => {
      rowObj[header] = columns[i] ?? "";
    });

    onRow(rowObj);
  }
};
export const convertRace = (raceCode: string) => {
  return raceNames[raceCode] ?? "Unknown";
};
export const convertClass = (classCode: string) => {
  return classNames[classCode] ?? "Unknown";
};
export const toSentenceCase = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const raceNames: Record<string, string> = {
  "0": "Unknown",
  "1": "Gnome",
  "2": "Human",
  "3": "Barbarian",
  "4": "Dwarf",
  "5": "High Elf",
  "6": "Dark Elf",
  "7": "Wood Elf",
  "8": "Half Elf",
  "10": "Troll",
  "11": "Ogre",
  "12": "Froglok",
  "13": "Iksar",
  "14": "Erudite",
  "15": "Halfling",
};
export const classNames: Record<string, string> = {
  "1": "Bard",
  "15": "Cleric",
  "16": "Druid",
  "4": "Enchanter",
  "5": "Magician",
  "6": "Monk",
  "7": "Necromancer",
  "8": "Paladin",
  "9": "Ranger",
  "10": "Rogue",
  "11": "Shadowknight",
  "12": "Shaman",
  "13": "Warrior",
  "14": "Wizard",
};
export type RowObject = Record<string, string>;
