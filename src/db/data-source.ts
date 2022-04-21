import { DataSource } from "typeorm";
import { databaseUrl } from "../config";
import { BankHour } from "./bank-hour";

export const dataSource = new DataSource({
  url: databaseUrl,
  type: "postgres",
  entities: [BankHour],
  synchronize: true,
  logging: false,
});

dataSource.initialize().catch(console.error);
