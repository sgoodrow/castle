import { createClient, SocketClosedUnexpectedlyError } from "redis";
import { UPSTASH_REDIS_URL } from "../config";

export const redisChannels = {
  raidReportChange: (threadId = "*") => `raid.${threadId}`,
};

const onError = (err: Error) =>
  err instanceof SocketClosedUnexpectedlyError
    ? null
    : console.error("Redis client error", err);

export const redisClient = createClient({ url: UPSTASH_REDIS_URL });
try {
  redisClient.connect();
  SocketClosedUnexpectedlyError;
  redisClient.on("error", onError);
} catch (err) {
  console.error(err);
}

export const redisListener = redisClient.duplicate();
try {
  redisListener.connect();
  redisListener.on("error", onError);
} catch (err) {
  console.error(err);
}

// flush utility
export const flushKeys = async (pattern: string) => {
  console.log("flush keys matching, ", pattern);
  for await (const key of redisClient.scanIterator({
    TYPE: "string", // `SCAN` only
    MATCH: pattern,
    COUNT: 10000,
  })) {
    console.log("redis delete: ", key);
    await redisClient.del(key);
  }
};
