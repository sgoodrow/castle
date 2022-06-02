import { dataSource } from "../../db/data-source";
import { InviteSimple } from "../../db/invite-simple";

export const checkInvite = async (discordId: string) => {
  const invite = await dataSource
    .getRepository(InviteSimple)
    .findOneBy({ discordId });
  if (invite) {
    throw new Error(`<@${discordId}> is already being tracked.`);
  }
};

export const sortInvites = (a: InviteSimple, b: InviteSimple) => {
  if (a.priority === b.priority) {
    return a.createdAt > b.createdAt ? 1 : -1;
  }
  return a.priority > b.priority ? -1 : 1;
};
