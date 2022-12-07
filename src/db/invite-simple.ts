import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Members } from "../features/invite-list/update-invite-action";

@Entity({})
export class InviteSimple {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  discordId!: string;

  @Column({ nullable: true })
  alt?: boolean;

  public get priority() {
    let score = 0;
    if (!this.alt) {
      score += 2;
    }
    return score;
  }

  public getDiscordDisplayName(members: Members) {
    return members?.get(this.discordId)?.displayName || `<@${this.discordId}>`;
  }

  public getRichLabel(members: Members) {
    const displayName = this.getDiscordDisplayName(members);
    return `${this.altNote}**${displayName}** <t:${this.time}:R>`;
  }

  public get richLabel() {
    return `${this.altNote}<@${this.discordId}> <t:${this.time}:R>`;
  }

  private get time() {
    return Math.floor(this.createdAt.getTime() / 1000);
  }

  private get altNote() {
    return this.alt ? "(Alt) " : "";
  }
}
