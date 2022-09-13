import { Column, Entity, PrimaryColumn } from "typeorm";

export enum Name {
  BankRequestInstructions = "bankRequestInstructions",
  JewelryRequestInstructions = "jewelryRequestInstructions",
  GuardInstructions = "guardInstructions",
  KnightInstructions = "knightInstructions",
  RaiderInstructions = "raiderInstructions",
  ReinforcementsInstructions = "reinforcementsInstructions",
  InviteListInstructions = "inviteListInstructions",
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
