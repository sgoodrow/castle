import Keyv from "keyv";
import { databaseUrl } from "../config";

export enum Item {
  BankRequestEmbedId = "bankRequestEmbedId",
}

export const store = new Keyv(databaseUrl);
