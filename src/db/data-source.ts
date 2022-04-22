import { DataSource } from "typeorm";
import { databaseUrl, environment } from "../config";
import { BankHour } from "./bank-hour";
import { Instructions } from "./instructions";

const ssl = { rejectUnauthorized: false };

export const dataSource = new DataSource({
  url: databaseUrl,
  type: "postgres",
  entities: [BankHour, Instructions],
  synchronize: true,
  logging: false,
  ssl: environment !== "local" ? ssl : undefined,
});

dataSource.initialize().catch(console.error);
