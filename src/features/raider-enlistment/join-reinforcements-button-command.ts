import { ButtonInteraction, CacheType, GuildMemberRoleManager } from "discord.js";
import { reinforcementsRoleId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";

class JoinReinforcementsButton extends ButtonCommand {
  public constructor(public readonly customId: string) {
    super(customId);
  }

  public async execute(interaction: ButtonInteraction<CacheType>) {
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!roles) {
      throw new Error("Could not determine your roles.");
    }
    if (roles.cache.get(reinforcementsRoleId)) {
      throw new Error(`You are already in <@&${reinforcementsRoleId}>.`);
    }
    await roles.add(reinforcementsRoleId);
    interaction.editReply({
      content: `Joined <@&${reinforcementsRoleId}>!`,
    });
  }
}

export const joinReinforcementsButtonCommand = new JoinReinforcementsButton("joinReinforcements");
