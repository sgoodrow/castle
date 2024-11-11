import { User } from "discord.js";
import { IDrusellaService } from "./service.i";
import { DsEntry, PrismaClient } from "@prisma/client";
import { log } from "console";
import moment from "moment";
import { PrismaFactory } from "../../shared/prisma";

export class DrusellaService implements IDrusellaService {
  private prisma!: PrismaClient;
  constructor() {
    if (!this.prisma) {
      this.prisma = PrismaFactory.get();
    }
  }

  async in(user: User): Promise<DsEntry> {
    // check for unclosed record
    const existingRec = await this.prisma.dsEntry.findFirst({
      where: {
        AND: {
          discordId: user.username,
          timeOut: null,
        },
      },
    });
    if (existingRec) {
      return Promise.reject(
        "You have an unclosed time log, use '/ds out' first."
      );
    }
    // create new record
    const inRec = await this.prisma.dsEntry.create({
      data: {
        discordId: user.username,
      },
    });
    log(`DrusellaService - ${user.username} in`);
    return inRec;
  }
  async out(user: User, date?: Date): Promise<DsEntry> {
    // find open record
    const currentRecord = await this.prisma.dsEntry.findFirst({
      where: {
        AND: {
          discordId: user.username,
          timeOut: null,
        },
      },
    });
    if (!currentRecord) {
      return Promise.reject("You have no open time log, use '/ds in' first.");
    }
    const now = moment(date);
    // calculate timespan
    currentRecord.minutes = now.diff(moment(currentRecord.timeIn), "minutes");
    currentRecord.timeOut = now.toDate();
    // update record
    log(`DrusellaService - ${user.username} out`);
    return await this.prisma.dsEntry.update({
      data: currentRecord,
      where: {
        id: currentRecord.id,
      },
    });
  }
  async get(user: User): Promise<DsEntry[]> {
    return await this.prisma.dsEntry.findMany({
      where: {
        discordId: user.username,
      },
      orderBy: {
        id: "asc",
      },
      take: 10,
    });
  }
}
