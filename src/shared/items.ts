import { replaceAll } from "./string-util";
import itemsData from "src/resources/items.json";

export interface Item {
  id: string;
  url: string;
  name: string;
}

export const mapFromData = (data: { [id: string]: string }, namePrefix = "") =>
  Object.entries(data).reduce((map, [id, url]) => {
    const item: Item = {
      id,
      url: `https://wiki.project1999.com${url}`,
      name: `${namePrefix}${replaceAll(decodeURI(url), "_", " ").substring(1)}`,
    };
    map[item.id] = item;
    return map;
  }, {} as { [id: string]: Item });

export const itemsMap = mapFromData(itemsData);
