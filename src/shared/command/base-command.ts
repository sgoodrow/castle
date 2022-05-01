import {
  ApplicationCommandOptionChoice,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  PermissionResolvable,
} from "discord.js";

export abstract class BaseCommand {
  public constructor(
    private readonly _name: string,
    public readonly description: string
  ) {}

  public get name() {
    return this._name;
  }

  public async autocomplete(interaction: AutocompleteInteraction<CacheType>) {
    const search = String(interaction.options.getFocused()).toLowerCase();
    const option = interaction.options.getFocused(true).name;
    const matches = (await this.getOptionAutocomplete(option, interaction))
      ?.filter(({ name }) => name.toLowerCase().includes(search))
      .slice(0, 25);
    return interaction.respond(matches || []);
  }

  public abstract getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<ApplicationCommandOptionChoice[] | undefined>;

  public abstract execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void>;

  protected requireUserRole(
    userId: string,
    roleId: string,
    interaction:
      | CommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>
  ) {
    const role = this.role(roleId, interaction);
    if (!role?.members.get(userId)) {
      throw new Error(`<@${userId}> is not a ${role}.`);
    }
  }

  protected role(
    roleId: string,
    interaction:
      | CommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>
  ) {
    return interaction.guild?.roles.cache.get(roleId);
  }

  protected requireInteractionMemberRole(
    roleId: string,
    interaction:
      | CommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>
  ) {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!roles) {
      throw new Error("Could not determine your roles.");
    }
    if (!roles.cache.get(roleId)) {
      throw new Error(`Must have <@&${roleId}> role to use this command.`);
    }
  }

  protected requireInteractionMemberPermission(
    permission: PermissionResolvable,
    interaction:
      | CommandInteraction<CacheType>
      | AutocompleteInteraction<CacheType>
  ) {
    if (!interaction.memberPermissions?.has(permission)) {
      throw new Error("You do not have permission to do this.");
    }
  }
}
