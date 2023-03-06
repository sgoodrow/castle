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

interface Event {
  name: string;
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

const DATE_FORMAT = "YYYY-MM-DD HH:mm";

const CASTLE_DKP_EVENT_URL_STRIP = /[-()'\s]/g;

const getEvents = async () => {
  events.purgeStale();
  if (events.size) {
    return events;
  }
  const { data } = await client.get<{ [_: string]: Event }>(route("events"));
  delete data.status;
  Object.values(data).forEach((e) => {
    events.set(e.name.replace("[Green] ", ""), e);
  });
  return events;
};

export const castledkp = {
  getEvent: async (label: string) => {
    const events = await getEvents();
    return events.get(label);
  },

  getEventLabels: async () => {
    const events = await getEvents();
    return [...events.keys()];
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

    const event = await castledkp.getEvent(tick.event);
    if (!event) {
      throw new Error(`Tick event type was not recognized: ${tick.event}`);
    }

    // create raid
    const { data } = await client.post<{ raid_id: number }>(route("add_raid"), {
      raid_date: tick.date.format(DATE_FORMAT),
      raid_attendees: { member: characterIds },
      raid_value: tick.value,
      raid_event_id: event.id,
      raid_note: `Tick ${tickNumber}. Details at ${threadUrl}`,
    });

    // add items to raid
    await Promise.all(tick.loot.map((l) => castledkp.addItem(data.raid_id, l)));

    return {
      event: tick.event,
      eventType: tick.event
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
