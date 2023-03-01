import axios from "axios";
import LRUCache from "lru-cache";
import moment from "moment";
import { castleDkpTokenRO } from "../config";
import { RaidReport } from "../features/dkp-records/raid-report";
import { tryRaidReportFinishedReactionAction } from "../features/dkp-records/raid-report-finished-reaction";
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

const DATE_FORMAT = "YYYY-MM-DD HH:mm";

const MISC_RAID_EVENT_ID = 20;

export const castledkp = {
  createRaidTicks: async (raid: RaidReport, threadUrl: string) => {
    const { data } = await instance.post<{ raid_id: number }>(
      route("add_raid"),
      {
        raid_date: moment().format(DATE_FORMAT),
        raid_attendees: raid.attendees.map((a) => a.name),
        raid_value: 0,
        raid_event_id: MISC_RAID_EVENT_ID,
        raid_note: `Created from Discord: ${threadUrl}`,
      }
    );
    return `${data.raid_id}`;
  },

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
      item_date: moment().format(DATE_FORMAT),
      item_name: item,
      item_buyers: { member: [characterId] },
      item_raid_id: raidId,
      item_value: price,
      item_itempool_id: 1,
    });
  },
};
