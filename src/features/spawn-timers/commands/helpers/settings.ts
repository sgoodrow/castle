import { timerPrismaClient } from "../../../../db/timer-client";

export async function getSettingByKey(key: string): Promise<string | null> {
  const setting = await timerPrismaClient.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function saveSettingByKey(
  key: string,
  value: string
): Promise<void> {
  await timerPrismaClient.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSettingByKey(key: string): Promise<void> {
  await timerPrismaClient.setting.deleteMany({ where: { key } });
}
