import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";

export abstract class BaseCommand {
  public constructor(
    private readonly _name: string,
    public readonly description: string,
    public readonly ephemeral = true
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
  ): Promise<ApplicationCommandOptionChoiceData[] | undefined>;

  public abstract execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<void>;
}
