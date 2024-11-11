import { PrismaClient } from "@prisma/client";

export class PrismaFactory {
  private static _client: PrismaClient;

  static get(): PrismaClient {
    if (!this._client) {
      this._client = new PrismaClient();
      this._client.$connect();
    }
    return this._client;
  }
}
