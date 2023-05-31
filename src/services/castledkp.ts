import axios from "axios";
import axiosRetry from "axios-retry";
import { partition } from "lodash";
import LRUCache from "lru-cache";
import moment from "moment";
import { castleDkpTokenRO } from "../config";
import {
  AdjustmentData,
  RaidTick,
  UPLOAD_DATE_FORMAT,
} from "../features/dkp-records/raid-tick";
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

export interface RaidEventData {
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

const events = new LRUCache<string, RaidEventData>({
  max: 200,
  ttl: 10 * MINUTES,
});

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

export interface CreateRaidResponse {
  eventUrlSlug: string;
  id: number;
  tick: RaidTick;
  invalidNames: string[];
}

const getCharacter = async (name: string) => {
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
        return undefined;
      }
      return Object.values(data.direct)[0];
    });
  if (result) {
    characters.set(name, result);
  }
  return result;
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

  createRaid: async (
    name: string,
    event: RaidEventData,
    characterId: string,
    threadUrl: string
  ) => {
    const { data } = await client.post<{ raid_id: number }>(route("add_raid"), {
      raid_date: moment().format(UPLOAD_DATE_FORMAT),
      raid_attendees: { member: [Number(characterId)] },
      raid_value: 0,
      raid_event_id: event.id,
      raid_note: `${name} ${threadUrl}`,
    });

    return {
      eventUrlSlug: event.name
        .toLowerCase()
        .replace(CASTLE_DKP_EVENT_URL_STRIP, "-"),
      id: data.raid_id,
    };
  },

  createRaidFromTick: async (
    tick: RaidTick,
    threadUrl: string
  ): Promise<CreateRaidResponse> => {
    // validate ticks
    if (tick.data.event === undefined) {
      throw new Error(`Tick is missing an event type.`);
    }
    if (tick.data.value === undefined) {
      throw new Error(`Tick is missing a value.`);
    }

    // get character ids
    const { characters, invalidNames } = await castledkp.getCharacters([
      ...tick.data.attendees,
    ]);
    const characterIds = characters.map((v) => v.id);
    if (!characterIds.length) {
      throw new Error(`Tick has no valid characters.`);
    }

    // create raid
    const { data } = await client.post<{ raid_id: number }>(route("add_raid"), {
      raid_date: tick.uploadDate,
      raid_attendees: { member: characterIds },
      raid_value: tick.data.value,
      raid_event_id: tick.data.event.id,
      raid_note: `${tick.name} ${threadUrl}`,
    });

    // add items to raid
    await Promise.all(
      tick.data.loot.map((l) => castledkp.addItem(data.raid_id, l))
    );

    // add adjustments to raid
    await Promise.all(
      tick.data.adjustments?.map((a) =>
        castledkp.addAdjustment(data.raid_id, a)
      ) || []
    );

    return {
      eventUrlSlug: tick.data.event.name
        .toLowerCase()
        .replace(CASTLE_DKP_EVENT_URL_STRIP, "-"),
      id: data.raid_id,
      tick: tick,
      invalidNames,
    };
  },

  getCharacters: async (names: string[]) => {
    const [characters, invalidNames] = partition(
      await Promise.all(
        names.map(async (n) => ({
          name: n,
          character: await getCharacter(n),
        }))
      ),
      (c) => !!c.character
    );
    return {
      characters: characters.map((v) => v.character as unknown as Character),
      invalidNames: invalidNames.map((v) => v.name),
    };
  },

  getCharacter: async (name: string, requireExists = true) => {
    const character = await getCharacter(name);
    if (!character && requireExists ) {
      throw new Error(
        `Character named '${name} does not exist on CastleDKP.com`
      );
    }
    return character;
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
      item_date: moment().format(UPLOAD_DATE_FORMAT),
      item_name: loot.item,
      item_buyers: { member: [character.id] },
      item_raid_id: raidId,
      item_value: loot.price,
      item_itempool_id: 1,
    });
  },

  addAdjustment: async (raidId: number, adjustment: AdjustmentData) => {
    const character = await castledkp.getCharacter(adjustment.player);
    return client.post(route("add_adjustment"), {
      adjustment_date: moment().format(UPLOAD_DATE_FORMAT),
      adjustment_reason: adjustment.reason,
      adjustment_members: { member: [character.id] },
      adjustment_value: adjustment.value,
      adjustment_raid_id: raidId,
      adjustment_event_id: 20,
    });
  },
};
