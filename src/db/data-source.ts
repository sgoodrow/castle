import { DataSource } from "typeorm";
import { databaseUrl } from "../config";
import { Banker } from "./banker";

export const dataSource = new DataSource({
  url: databaseUrl,
  type: "postgres",
  entities: [Banker],
  synchronize: true,
  logging: false,
});

dataSource.initialize().catch(console.error);
