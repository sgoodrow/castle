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

export const betaDkpService = {
  upsertRaidActivityType: async (name: string, defaultPayout: number) => {
    const response = await client.post<{ id: number }>("/api/v1/raid-activity-type/upsert", {
      name,
      defaultPayout,
    });
    return response.data.id;
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
    client.post("/api/v1/raid-activity", {
      activity: {
        typeId,
        createdAt: raidTick.data.date,
        payout: raidTick.data.value === undefined ? undefined : Number(raidTick.data.value),
        note: raidTick.note,
        attendees: raidTick.data.attendees.map((name) => ({
          characterName: name,
          pilotCharacterName: name,
        })),
        adjustments:
          raidTick.data.adjustments?.map(({ player, value, reason }) => ({
            characterName: player,
            pilotCharacterName: player,
            amount: Number(value),
            reason,
          })) || [],
        purchases: raidTick.data.loot.map(({ buyer, item, price }) => ({
          characterName: buyer,
          pilotCharacterName: buyer,
          amount: Number(price),
          itemName: item,
        })),
      },
    } satisfies {
      activity: {
        typeId: number;
        payout?: number;
        note?: string;
        createdAt: string;
        attendees: {
          characterName: string;
          pilotCharacterName?: string;
        }[];
        adjustments: {
          amount: number;
          reason: string;
          characterName: string;
          pilotCharacterName?: string;
        }[];
        purchases: {
          amount: number;
          itemName: string;
          characterName: string;
          pilotCharacterName?: string;
        }[];
      };
    });
  },
};
