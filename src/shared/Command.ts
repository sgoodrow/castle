import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";

export abstract class Command {
  public constructor(public readonly name: string) {}
  public abstract listen(
    interaction: CommandInteraction<CacheType>
  ): Promise<boolean>;
  public abstract get builder(): any;

  protected requireRole(
    roleId: string,
    interaction: CommandInteraction<CacheType>
  ) {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!roles) {
      throw new Error("Could not determine your roles.");
    }
    if (!roles.cache.get(roleId)) {
      throw new Error("Only bankers are authorized to start spell auctions.");
    }
  }
}
