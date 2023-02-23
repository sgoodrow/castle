import axios from "axios";
import LRUCache from "lru-cache";
import moment from "moment";
import { castleDkpTokenRO } from "../config";
import { HOURS, MONTHS } from "../shared/time";

const route = (f: string) => `api.php?function=${f}`;

const instance = axios.create({
  baseURL: "https://castledkp.com",
});

instance.interceptors.request.use((config) => {
  if (!castleDkpTokenRO) {
    throw new Error("Cannot query CastleDKP without an RO token.");
  }
  config.params = {
    ...config.params,
    atoken: castleDkpTokenRO,
    atype: "api",
    format: "json",
  };
  return config;
});

interface Character {
  id: number;
  name: string;
  main: boolean;
  classname: string;
}

const characters = new LRUCache<string, Character>({
  max: 200,
  ttl: 3 * MONTHS,
  updateAgeOnGet: true,
});

export const castledkp = {
  getCharacter: async (name: string) => {
    const character = characters.get(name);
    if (character) {
      return character;
    }
    const result = await instance
      .get<{ direct?: { [key: string]: Character } }>(route("search"), {
        params: {
          in: "charname",
          for: name,
        },
      })
      .then(({ data }) => {
        if (!data.direct) {
          throw new Error(
            `LOOKUP FAILED: There is no character named '${name}'.`
          );
        }
        return Object.values(data.direct)[0];
      });
    characters.set(name, result);
    return result;
  },

  addItem: async ({
    item,
    characterId,
    raidId,
    price,
  }: {
    item: string;
    characterId: number;
    raidId: number;
    price: number;
  }) => {
    if (!raidId) {
      throw new Error("BAD REQUEST: No raid ID provided.");
    }
    return instance.post(route("add_item"), {
      item_date: moment().format("YYYY-MM-DD HH:mm"),
      item_name: item,
      item_buyers: { member: [characterId] },
      item_raid_id: raidId,
      item_value: price,
      item_itempool_id: 1,
    });
  },
};
