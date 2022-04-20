import { Column, Entity, PrimaryColumn } from "typeorm";
import { Day } from "../features/bank-request-info/types";

@Entity()
export class Banker {
  @PrimaryColumn()
  userId!: string;

  @Column({ type: "enum", enum: Day })
  day!: Day;

  @Column()
  hour!: number;

  @Column()
  pm!: boolean;

  @Column()
  canceled!: boolean;
}
