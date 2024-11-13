import { GuildMember, User } from "discord.js";
import { IDrusellaService } from "./ds-service.i";
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

  async in(user: GuildMember): Promise<DsEntry> {
    // check for unclosed record
    const existingRec = await this.prisma.dsEntry.findFirst({
      where: {
        AND: {
          discordId: user.user.username,
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
        discordId: user.user.username,
        nickname: user.nickname,
      },
    });
    log(`DrusellaService - ${user.nickname} in`);
    return inRec;
  }
  async out(user: GuildMember, date?: Date): Promise<DsEntry> {
    // find open record
    const currentRecord = await this.prisma.dsEntry.findFirst({
      where: {
        AND: {
          discordId: user.user.username,
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
    log(`DrusellaService - ${user.nickname} out`);
    return await this.prisma.dsEntry.update({
      data: currentRecord,
      where: {
        id: currentRecord.id,
      },
    });
  }
  public async get(user: GuildMember, count: number): Promise<DsEntry[]> {
    return await this.prisma.dsEntry.findMany({
      where: {
        discordId: user.user.username,
      },
      orderBy: {
        id: "asc",
      },
      take: count,
    });
  }
  public async getUserLog(user: GuildMember): Promise<string> {
    const logEntries = await this.get(user, 10);
    let logOutput = `### ${user.nickname}\n\n`;

    logOutput += logEntries
      .map((entry) => this.parseLogEntry(entry, false))
      .join("\n");
    return Promise.resolve(logOutput);
  }

  public async getOpenEntries(): Promise<string> {
    let logOutput = `### Open time entries\n\n`;
    const logEntries = await this.prisma.dsEntry.findMany({
      where: {
        timeOut: null,
      },
      orderBy: {
        discordId: "asc",
      },
    });
    logOutput += logEntries
      .map((entry) => this.parseLogEntry(entry, true))
      .join("\n");
    return Promise.resolve(logOutput);
  }

  private parseLogEntry(entry: DsEntry, showUser: boolean): string {
    let logEntry = `${showUser ? entry.nickname : entry.id}\t\t${moment(
      entry.timeIn
    ).toString()}`;
    if (entry.timeOut) {
      logEntry += ` to ${moment(entry.timeOut).toString()} - ${
        entry.minutes
      } minutes`;
    }
    return logEntry;
  }
}
