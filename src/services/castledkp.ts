import axios from "axios";
import axiosRetry from "axios-retry";
import LRUCache from "lru-cache";
import moment from "moment";
import { castleDkpTokenRO } from "../config";
import { RaidTick } from "../features/dkp-records/raid-report";
import { MINUTES, MONTHS } from "../shared/time";

const route = (f: string) => `api.php?function=${f}`;

const client = axios.create({
  baseURL: "https://castledkp.com",
});
axiosRetry(client, { retries: 5, retryDelay: axiosRetry.exponentialDelay });

client.interceptors.request.use((config) => {
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

export interface Event {
  name: string;
  shortName: string;
  abreviation: string;
  value: number;
  id: number;
}

const characters = new LRUCache<string, Character>({
  max: 200,
  ttl: 3 * MONTHS,
  updateAgeOnGet: true,
});

const events = new LRUCache<string, Event>({
  max: 200,
  ttl: 10 * MINUTES,
});

export const SHORT_DATE_FORMAT = "M-D";
const DATE_FORMAT = "YYYY-MM-DD HH:mm";
const CASTLE_DKP_EVENT_URL_STRIP = /[-()'\s]/g;

const getEvents = async () => {
  events.purgeStale();
  if (events.size) {
    return events;
  }
  const { data } = await client.get<{
    [_: string]: { name: string; value: number; id: number };
  }>(route("events"));
  delete data.status;
  Object.values(data).forEach(({ id, name, value }) => {
    const abreviation = name.substring(
      name.indexOf("[") + 1,
      name.indexOf("]")
    );
    const shortName = name.replace(`[${abreviation}]`, "").trim();
    events.set(name.trim(), {
      id,
      value,
      name,
      abreviation,
      shortName,
    });
  });
  return events;
};

export const castledkp = {
  getEvent: async (label: string) => {
    const events = await getEvents();
    return events.get(label);
  },

  getEvents: async () => {
    const events = await getEvents();
    return [...events.values()];
  },

  createRaid: async (tick: RaidTick, tickNumber: number, threadUrl: string) => {
    // validate ticks
    if (tick.event === undefined) {
      throw new Error(`Tick is missing an event type.`);
    }
    if (tick.value === undefined) {
      throw new Error(`Tick is missing a value.`);
    }

    // get character ids
    const characterIds = await Promise.all(
      tick.attendees.map((a) => castledkp.getCharacter(a).then((c) => c.id))
    );

    // get note
    const date = moment(tick.date);
    let note = `${date.format(SHORT_DATE_FORMAT)} ${
      tick.event.shortName
    } Hour ${tick.tickNumber}`;
    if (tick.note) {
      note += ` (${tick.note})`;
    }
    note += ` ${threadUrl}`;

    // create raid
    const { data } = await client.post<{ raid_id: number }>(route("add_raid"), {
      raid_date: date.format(DATE_FORMAT),
      raid_attendees: { member: characterIds },
      raid_value: tick.value,
      raid_event_id: tick.event.id,
      raid_note: note,
    });

    // add items to raid
    await Promise.all(tick.loot.map((l) => castledkp.addItem(data.raid_id, l)));

    return {
      eventUrlSlug: tick.event.name
        .toLowerCase()
        .replace(CASTLE_DKP_EVENT_URL_STRIP, "-"),
      id: data.raid_id,
      tickNumber,
    };
  },

  getCharacter: async (name: string) => {
    const character = characters.get(name);
    if (character) {
      return character;
    }
    const result = await client
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

  addItem: async (
    raidId: number,
    loot: {
      item: string;
      buyer: string;
      price: number;
    }
  ) => {
    const character = await castledkp.getCharacter(loot.buyer);
    return client.post(route("add_item"), {
      item_date: moment().format(DATE_FORMAT),
      item_name: loot.item,
      item_buyers: { member: [character.id] },
      item_raid_id: raidId,
      item_value: loot.price,
      item_itempool_id: 1,
    });
  },
};
