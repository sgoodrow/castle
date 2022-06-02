import { DataSource } from "typeorm";
import { databaseUrl, environment } from "@shared/config";
import { BankHour } from "./bank-hour";
import { Instructions } from "./instructions";
import { InviteSimple } from "./invite-simple";

const ssl = { rejectUnauthorized: false };

export const dataSource = new DataSource({
  url: databaseUrl,
  type: "postgres",
  entities: [BankHour, Instructions, InviteSimple],
  synchronize: true,
  logging: false,
  ssl: environment !== "local" ? ssl : false,
});

dataSource
  .initialize()
  .then((c) => {
    // https://github.com/typeorm/typeorm/issues/3286#issuecomment-486991573
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver = c.driver as any;
    driver.postgres.defaults.parseInputDatesAsUTC = true;
    driver.postgres.types.setTypeParser(
      1114,
      (str: string) => new Date(str + "Z")
    );
  })
  .catch(console.error);
