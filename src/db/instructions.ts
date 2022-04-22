import { Column, Entity, PrimaryColumn } from "typeorm";

export enum Name {
  BankRequestInstructions = "bankRequestInstructions",
}

@Entity()
export class Instructions {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column({ default: false })
  canceled!: boolean;
}
