import { PrismaClient } from "@prisma/client";
import { SPAWN_TIMER_DATABASE_URL } from "../config";

export const timerPrismaClient = new PrismaClient({
  datasourceUrl: SPAWN_TIMER_DATABASE_URL,
});
