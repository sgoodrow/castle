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
  main?: string;

  public get priority() {
    let score = 0;
    if (this.interviewed) {
      score += 1;
    }
    if (!this.main) {
      score += 2;
    }
    return score;
  }

  public get richLabel() {
    return `${this.altNote}**${this.capitalizedName}**${this.characterDetails} <t:${this.time}:R>`;
  }

  public getFriendEntry(i: number) {
    return `Friend${i}=${this.name}`;
  }

  private get time() {
    return Math.floor(this.createdAt.getTime() / 1000);
  }

  private get altNote() {
    return this.main ? `(Alt: ${this.main}) ` : "";
  }

  private get characterDetails() {
    const characterData = [this.class, this.level].filter(Boolean);
    return characterData.length > 0 ? ` (${characterData.join(" ")})` : "";
  }

  public get capitalizedName() {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
}
