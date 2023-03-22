import { createClient } from "redis";
import { UPSTASH_REDIS_URL } from "../config";

export const redisChannels = {
  raidReportChange: (threadId = "*") => `raid.${threadId}`,
};

export const redisClient = createClient({ url: UPSTASH_REDIS_URL });
redisClient.connect();
redisClient.on("error", (err) => console.error("Redis client error", err));

export const redisListener = redisClient.duplicate();
redisListener.connect();
redisListener.on("error", (err) => console.error("Redis listener error", err));
