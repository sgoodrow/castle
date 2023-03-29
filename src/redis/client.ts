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
redisClient.connect();
SocketClosedUnexpectedlyError;
redisClient.on("error", onError);

export const redisListener = redisClient.duplicate();
redisListener.connect();
redisListener.on("error", onError);
