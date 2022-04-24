import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Class } from "../shared/classes";

@Entity({})
export class Invite {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  name!: string;

  @Column()
  byUserId!: string;

  @Column({ default: false })
  interviewed!: boolean;

  @Column({ default: false })
  invited!: boolean;

  @Column({ default: false })
  canceled!: boolean;

  @Column({ type: "enum", enum: Class, nullable: true })
  class!: Class | null;

  @Column({ nullable: true })
  level?: number;

  @Column({ nullable: true })
  note?: string;

  public get richLabel() {
    return `<t:${this.time}:R> **${this.capitalizedName}**${this.characterDetails} added by <@${this.byUserId}>${this.noteDetails}`;
  }

  private get time() {
    return Math.floor(this.createdAt.getTime() / 1000);
  }

  private get noteDetails() {
    return this.note ? `: ${this.note}` : "";
  }

  private get characterDetails() {
    const characterData = [this.class, this.level].filter(Boolean);
    return characterData.length > 0 ? ` (${characterData.join(" ")})` : "";
  }

  public get capitalizedName() {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
}
