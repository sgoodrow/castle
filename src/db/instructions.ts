import { Column, Entity, PrimaryColumn } from "typeorm";

export enum Name {
  BankRequestInstructions = "bankRequestInstructions",
  JewelryRequestInstructions = "jewelryRequestInstructions",
  RaidSchedule = "raidSchedule",
  ApplicationInstructions = "applicationInstructions",
  RaidBotInstructions = "botInstructions",
  BankBotInstructions = "bankBotInstructions",
  GuardBotInstructions = "guardBotInstructions",
  KnightInstructions = "knightInstructions",
  RaiderInstructions = "raiderInstructions",
  ReinforcementsInstructions = "reinforcementsInstructions",
  InviteListInstructions = "inviteListInstructions",
  BotStatusEmbed = "botStatusEmbed",
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
