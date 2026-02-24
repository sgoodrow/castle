import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  EmbedBuilder,
  ChannelType,
} from "discord.js";
import {
  castleDkpBonusesCharId,
  dkpBonusesChannelId,
  dkpDeputyRoleId,
  officerRoleId,
  raiderRoleId,
} from "../../../config";
import { redisClient } from "../../../redis/client";
import { castledkp } from "../../../services/castledkp";
import { Subcommand } from "../../../shared/command/subcommand";
import { addRoleToThread } from "../../../shared/command/util";
import { getRaidUrl } from "../raid-tick";

enum Option {
  Name = "name",
  Event = "event",
}

export class BonusesThreadSubcommand extends Subcommand {
  public constructor(name: string, description: string) {
    super(name, description);
  }

  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize user
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    if (!(roles.cache.has(dkpDeputyRoleId) || roles.cache.has(officerRoleId))) {
      throw new Error("Must be a DKP Deputy or Offier to use this command");
    }

    if (!castleDkpBonusesCharId) {
      throw new Error("The Castle DKP Bonuses Character ID is not set.");
    }

    const eventName = this.getRequiredOptionValue<string>(
      Option.Event,
      interaction
    );
    const event = await castledkp.getEvent(eventName);
    if (!event) {
      throw new Error(`The event type "${eventName}" could not be found.`);
    }

    const name = this.getRequiredOptionValue<string>(Option.Name, interaction);

    // create thread
    const channel = await interaction.guild?.channels.fetch(
      dkpBonusesChannelId
    );
    if (!channel) {
      throw new Error("Could not find DKP bonuses channel");
    }
    if (channel.type !== ChannelType.GuildText) {
      throw new Error("DKP bonuses channel is not a text channel");
    }
    if (channel.isThread()) {
      throw new Error("DKP bonuses channel is a thread");
    }
    const message = await channel.send({
      content: `_ _`,
    });
    const thread = await message.startThread({
      autoArchiveDuration: 4320,
      name: name,
    });

    // create raid
    const raid = await castledkp.createRaid(
      name,
      event,
      castleDkpBonusesCharId,
      `https://discord.com/channels/${thread.guildId}/${thread.id}`
    );

    // save to redis
    await redisClient.set(thread.id, raid.id);

    // link to raid with instructions
    await thread.send({
      embeds: [
        new EmbedBuilder({
          title: `Raid: __${name}__`,
          url: `https://castle.opendkp.com/#/adjustments`,
        }),
        new EmbedBuilder({
          title: "Instructions",
          description: `• <@&${raiderRoleId}>s may use the \`!adj\` command to submit bonus requests.
• The bot will react with ⚠️ if the request is invalid (wrong format).
• Deputies will ✅ requests to add approve them.
• Requests made by deputies are automatically approved.`,
        }).addFields([
          {
            name: "Add a raid adjustment bonus. Context is optional.",
            value: "`!adj Pumped 5 reason (context)`",
          },
        ]),
      ],
    });

    // add deputies to thread
    await addRoleToThread(dkpDeputyRoleId, thread);

    // done!
    await interaction.editReply(
      `Created new DKP bonus thread ${thread} and raid ${raid.eventUrlSlug}".`
    );
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName(Option.Event)
          .setDescription("The type of raid event to create.")
          .setAutocomplete(true)
          .setRequired(true)
      )
      .addStringOption((o) =>
        o
          .setName(Option.Name)
          .setDescription("The name of the raid bonuses.")
          .setRequired(true)
      );
  }

  public async getOptionAutocomplete(option: string) {
    switch (option) {
      case Option.Event:
        return (await castledkp.getEvents()).map((e) => ({
          name: e.shortName,
          value: e.name,
        }));
      default:
        return;
    }
  }
}

export const bonusesThreadSubcommand = new BonusesThreadSubcommand(
  "bonuses",
  "Creates a raid bonuses thread."
);
