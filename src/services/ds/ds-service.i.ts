import { DsEntry } from "@prisma/client";
import { GuildMember, User } from "discord.js";

export interface IDrusellaService {
  in(guildMember: GuildMember): Promise<DsEntry>;
  out(guildMember: GuildMember, date?: Date): Promise<DsEntry>;
  get(user: GuildMember, count: number): Promise<DsEntry[]>;
}
