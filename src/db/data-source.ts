import { DataSource } from "typeorm";
import { DATABASE_URL, SSL } from "../config";
import { BankHour } from "./bank-hour";
import { Instructions } from "./instructions";
import { InviteSimple } from "./invite-simple";

const ssl = { rejectUnauthorized: false };

export const dataSource = new DataSource({
  url: DATABASE_URL || "postgresql://admin:password@localhost:5432/castle",
  type: "postgres",
  entities: [BankHour, Instructions, InviteSimple],
  synchronize: true,
  logging: false,
  ssl: SSL === "false" ? false : ssl,
});

dataSource
  .initialize()
  .then((c) => {
    // https://github.com/typeorm/typeorm/issues/3286#issuecomment-486991573
    const driver = c.driver as unknown;
    driver.postgres.defaults.parseInputDatesAsUTC = true;
    driver.postgres.types.setTypeParser(1114, (str: string) => new Date(str + "Z"));
  })
  .catch(console.error);
