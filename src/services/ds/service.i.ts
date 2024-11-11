import { DsEntry } from "@prisma/client";
import { User } from "discord.js";

export interface IDrusellaService {
  in(guildMember: User): Promise<DsEntry>;
  out(guildMember: User, date?: Date): Promise<DsEntry>;
  get(user: User): Promise<DsEntry[]>;
}
