import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  Permissions,
  User,
} from "discord.js";
import {
  gatehouseChannelId,
  greenRoleId,
  raiderEnlistmentChannelId,
  rolesChannelId,
} from "../../config";
import {
  ReactionAction,
  reactionActionExecutor,
} from "../../listeners/reaction-action";
import { roleIdsByTag, TagReaction } from "./tags";

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
    if (!reactor?.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
      return;
    }

    // apply roles
    if (!this.roleIds) {
      return;
    }
    const author = await this.members?.fetch(this.authorId);
    if (!author) {
      throw new Error("Something went wrong retrieving the message author.");
    }

    author.roles.add(this.roleIds);

    // send welcome message
    let welcome = `${author} Welcome to the Garrison! Check out <#${rolesChannelId}>`;
    if (this.roleIds.includes(greenRoleId)) {
      welcome += ` and, when you're ready, <#${raiderEnlistmentChannelId}>.`;
    } else {
      welcome += ".";
    }
    this.message.channel.send(welcome);
  }

  private get roleIds() {
    return roleIdsByTag[this.reaction.emoji.name as TagReaction];
  }
}
