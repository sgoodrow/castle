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
  createRaid: async (raidTick: RaidTick) => {
    if (!castleDkp2TokenRW) {
      console.error("Cannot query CastleDKP2 without an RW token.");
      return;
    }
    try {
      const response = await client.post("/api/v1/raid", {
        activity: {
          typeId: 1,
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
          "Error creating raid:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error creating raid:", error);
      }
      throw error;
    }
  },
};
