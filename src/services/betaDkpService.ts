import axios from "axios";
import { castleDkp2TokenRW } from "../config";
import { RaidTick } from "../features/dkp-records/raid-tick";

// This client is for a new DKP application that is being built as a replacement for CastleDKP.com, which
// at the time of writing is an old EqDkpPlus site with scalability and maintainence issues.
//
// It is not yet clear that this effort will continue to completion, so this is being added experimentally
// to capture realistic data in a non-intrusive way.

const client = axios.create({
  baseURL: "https://castledkp.vercel.app",
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${castleDkp2TokenRW}`;
  return config;
});

const handleError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    console.error(
      "Beta error creating raid:",
      error.response?.data || error.message
    );
  } else {
    console.error("Beta error creating raid:", error);
  }
  throw error;
};

export const betaDkpService = {
  upsertRaidActivityType: async (name: string, defaultPayout: number) => {
    try {
      const response = await client.post<{ id: number }>(
        "/api/v1/raid-activity-type/upsert",
        { name, defaultPayout }
      );
      return response.data.id;
    } catch (error) {
      handleError(error);
    }
  },

  createRaid: async ({
    raidTick,
    raidActivityType,
  }: {
    raidTick: RaidTick;
    raidActivityType: { name: string; defaultPayout: number };
  }) => {
    const typeId = await betaDkpService.upsertRaidActivityType(
      raidActivityType.name,
      raidActivityType.defaultPayout
    );

    try {
      client.post("/api/v1/raid-activity", {
        activity: {
          typeId,
          payout: raidTick.data.value,
          note: raidTick.note,
        },
        attendees: raidTick.data.attendees.map((name) => ({
          characterName: name,
          pilotCharacterName: name,
        })),
        adjustments: raidTick.data.adjustments?.map(
          ({ player, value, reason }) => ({
            characterName: player,
            pilotCharacterName: player,
            amount: value,
            reason,
          })
        ),
        purchases: raidTick.data.loot.map(({ buyer, item, price }) => ({
          characterName: buyer,
          pilotCharacterName: buyer,
          amount: price,
          itemName: item,
        })),
      });
    } catch (error) {
      handleError(error);
    }
  },
};
