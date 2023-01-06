import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Day, Days } from "../features/bank-request-info/types";

@Entity()
export class BankHour {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: string;

  @Column({ type: "enum", enum: Day })
  day!: Day;

  @Column({ type: "real" })
  hour!: number;

  public get richLabel() {
    const date = this.nextBankerHour.getTime() / 1000;
    return `<t:${date}:R> <@${this.userId}> <t:${date}:F>`;
  }

  public get nextBankerHour() {
    const day = Days.indexOf(this.day) + 1;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((7 + day - d.getUTCDay()) % 7));
    d.setUTCHours(Math.floor(this.hour), (this.hour % 1) * 60, 0, 0);
    if (d < new Date()) {
      d.setUTCDate(d.getUTCDate() + 7);
    }
    return d;
  }
}
