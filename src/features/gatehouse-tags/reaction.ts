import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import {
  castleRoleId,
  gatehouseChannelId,
  inviteListChannelId,
  raiderEnlistmentChannelId,
  rolesChannelId,
  competitorRoleId,
  guardRoleId,
  officerRoleId,
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../shared/action/reaction-action";
import { greetingActivity } from "../gatehouse/guild-member-add-listener";
import { actionConfigByReaction, Emoji, ActionType } from "./config";

export const tryGatehouseReactionAction = (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => reactionActionExecutor(new GatehouseReactionAction(reaction, user));

class GatehouseReactionAction extends ReactionAction {
  public async execute() {
    // filter channel
    if (this.message.channel.id !== gatehouseChannelId) {
      return;
    }

    // authorize user
    const reactor = await this.members?.fetch(this.user.id);
    if (
      !(
        reactor?.roles.cache.has(guardRoleId) ||
        reactor?.roles.cache.has(officerRoleId)
      )
    ) {
      return;
    }

    // todo: refactor to not use a switch
    switch (this.action) {
      case ActionType.Tag:
        await this.tag();
        return;
      case ActionType.Interview:
        await this.interview();
        return;
      case ActionType.Instruct:
        await this.instruct();
        return;
    }
  }

  private async tag() {
    // apply roles
    if (!this.roleIds) {
      return;
    }
    const author = await this.members?.fetch(this.authorId);
    if (!author) {
      throw new Error("Something went wrong retrieving the message author.");
    }

    author.roles.add(this.roleIds);

    if (this.roleIds.includes(competitorRoleId)) {
      return this.message.channel.send(
        `Thanks for introducing yourself, ${author}! Unfortunately, we do not grant access to our private Discord channels to players who are not in Castle or an allied guild. You're welcome to chat with us in our public channels, though -- don't be a stranger!`
      );
    }

    const castle = this.roleIds.includes(castleRoleId);

    // send welcome message
    let welcome = `Welcome to the Garrison, ${author}! Check out these channels:`;
    if (castle) {
      welcome += `\n• Visit <#${inviteListChannelId}> (hit the "add self to invite list" button)`;

      this.message.author?.send({
        content:
          "Welcome to Castle! Please add assign yourself some class roles and add yourself to the invite list, a Guard or Officer will contact you soon.",
        files: [
          {
            attachment:
              "https://cdn.discordapp.com/attachments/567113199535652864/1049937688595283968/green-channels.png",
            name: "roles-and-invite-list-channels.png",
          },
          {
            attachment:
              "https://cdn.discordapp.com/attachments/567113199535652864/1049937689073422396/invite-button.png",
            name: "add-self-to-invite-list.png",
          },
        ],
      });
    }
    welcome += `\n• Visit <#${rolesChannelId}> (set your class)`;
    welcome += `\n• Visit <#${raiderEnlistmentChannelId}> (join the raid force)`;
    this.message.channel.send(welcome);
  }

  private async interview() {
    await this.message
      .reply(`Do you agree to these rules? If so, the next available officer will give you Discord tags.

**Castle Rules**:
(1) no real-life politics or contentious real-life issues in guild chat
(2) no real-life slurs in guild chat
(3) no fights or freakouts in guild chat - use /tells or talk to an officer
(4) follow all Project 1999 rules such as no RMT or multi-boxing
(5) don't be a jerk.`);
  }

  private async instruct() {
    await this.message.reply(greetingActivity);
  }

  private get emoji() {
    return this.reaction.emoji.name as Emoji;
  }

  private get action() {
    return this.actionConfig?.action;
  }

  private get roleIds() {
    return this.actionConfig?.roles;
  }

  private get actionConfig() {
    if (!this.emoji) {
      return;
    }
    if (!Object.values(Emoji).includes(this.emoji)) {
      return;
    }
    return actionConfigByReaction[this.emoji];
  }
}
