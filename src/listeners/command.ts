import {
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
} from "discord.js";

export const getOption = (
  name: string,
  interaction: CommandInteraction<CacheType>
) => interaction.options.data.find((d) => d.name === name);

export abstract class Command {
  public constructor(public readonly name: string) {}

  public abstract autocomplete(
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<void>;

  protected abstract execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void>;

  public async listen(interaction: CommandInteraction<CacheType>) {
    try {
      this.execute(interaction);
      return true;
    } catch (error) {
      await interaction.reply({
        content: String(error),
        ephemeral: true,
      });
      return false;
    }
  }

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
      throw new Error(`Must have ${roleId} to use this command.`);
    }
  }
}
