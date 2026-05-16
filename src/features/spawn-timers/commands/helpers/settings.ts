import { prismaClient } from "../../../..";

export async function getSettingByKey(key: string): Promise<string | null> {
  const setting = await prismaClient.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function saveSettingByKey(
  key: string,
  value: string
): Promise<void> {
  await prismaClient.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function deleteSettingByKey(key: string): Promise<void> {
  await prismaClient.setting.deleteMany({ where: { key } });
}
