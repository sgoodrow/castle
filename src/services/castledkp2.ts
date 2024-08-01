import axios from "axios";
import { castleDkp2TokenRW } from "../config";
import { RaidTick } from "../features/dkp-records/raid-tick";

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

export const castledkp2 = {
  upsertRaidActivityType: async (name: string, defaultPayout: number) => {
    try {
      const response = await client.post<{ id: number }>(
        "/api/v1/raid-activity-type",
        {
          name,
          defaultPayout,
        }
      );
      console.log("Beta created raid activity type:", response.data.id);
      return response.data.id;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Beta error creating raid activity type:",
          error.response?.data || error.message
        );
      } else {
        console.error("Beta error creating raid activity type:", error);
      }
      throw error;
    }
  },

  createRaid: async ({
    raidTick,
    raidActivityType,
  }: {
    raidTick: RaidTick;
    raidActivityType: { name: string; defaultPayout: number };
  }) => {
    const typeId = await castledkp2.upsertRaidActivityType(
      raidActivityType.name,
      raidActivityType.defaultPayout
    );

    try {
      const response = await client.post("/api/v1/raid-activity", {
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
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Beta error creating raid activity:",
          error.response?.data || error.message
        );
      } else {
        console.error("Beta error creating raid activity:", error);
      }
      throw error;
    }
  },
};
