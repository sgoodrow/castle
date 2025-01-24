import {
  ActionRowBuilder,
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
  ComponentType,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getTextChannel, prismaClient } from "../..";
import { batphoneChannelId, raiderRoleId, wakeupChannelId } from "../../config";
import { authorizeByMemberRoles } from "../../shared/command/util";
import { officerRoleId, modRoleId, knightRoleId } from "../../config";
import { error } from "console";
import { redisClient } from "../../redis/client";
import { isObject } from "lodash";
import { container } from "tsyringe";
import { WakeupService } from "../wakeup/wakeup.service";
import { truncate } from "lodash";
import { RequestBotButtonCommand } from "./request-bot-button-command";
import { PublicAccountsFactory } from "../../services/bot/bot-factory";
import { LocationService } from "../../services/location";
import { PrismaClient } from "@prisma/client";

class sendBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    const bpChannel = await getTextChannel(batphoneChannelId);
    const val = this.getOption("message", interaction)?.value as string;
    // const savedMsg = await redisClient.hGet("bp", String(val));
    const savedBp = await prismaClient.batphone.findFirst({
      where: {
        key: val,
      },
    });
    const message = savedBp?.message || val;
    if (typeof message === "string") {
      const formattedMessage = message.replace(
        /\\n/g,
        `
`
      );
      const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] =
        await this.getBotButtonComponents(savedBp?.location || "");
      await bpChannel.send({
        content:
          `[${interaction.user}] <@&${raiderRoleId}> 
` + formattedMessage,
        components: savedBp?.location ? components : undefined,
      });

      interaction.editReply("Batphone posted: " + message);

      // Wakeup
      if (wakeupChannelId) {
        const wakeupService = container.resolve(WakeupService);
        wakeupService.runWakeup(
          `Batphone. ${interaction.user} sent ${message}`
        );
      }
    } else {
      interaction.editReply("Failed to post batphone.");
    }
  }

  private async getBotButtonComponents(location: string) {
    const bots = await PublicAccountsFactory.getService().getBotsForBatphone(
      location
    );
    const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
    let row;
    for (let i = 0; i < bots.length; i++) {
      if (i % 5 === 0) {
        row = new ActionRowBuilder<MessageActionRowComponentBuilder>({
          type: ComponentType.ActionRow,
          components: [],
        });
        components.push(row);
      }
      row?.addComponents(
        new RequestBotButtonCommand(
          `requestbot_${bots[i].name}`
        ).getButtonBuilder(bots[i])
      );
    }
    return components;
  }

  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    const res = await prismaClient.batphone.findMany();

    return res.map((opt) => {
      return { name: opt.key, value: opt.key };
    });
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName("message")
        .setDescription("BP Message")
        .setRequired(true)
        .setAutocomplete(true)
    );
  }
}

class setBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    const message = this.getOption("message", interaction)?.value;
    try {
      if (typeof message === "string") {
        if (message.length > 2000) {
          // max message length is 2000 chars
          throw new Error("Message is too long.");
        }
        let key = this.getOption("key", interaction)?.value;
        if (!key) {
          key = message.split(" ")[0].toLowerCase();
        }
        const location = this.getOption("location", interaction)
          ?.value as string;
        key = truncate(String(key), { length: 100 }); // max option length = 100
        await prismaClient.batphone.create({
          data: {
            key: key,
            message: message,
            location: location,
          },
        });
        // await redisClient.hSet("bp", String(key), message);
        // await redisClient.hSet("bp", String(location), location);
        interaction.editReply("Saved preset message: " + message);
      } else {
        throw error;
      }
    } catch (err) {
      console.error(err);
      interaction.editReply("Failed save batphone message: " + err);
    }
  }
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    switch (option) {
      case "location":
        return LocationService.getInstance().getLocationOptions();
      default:
        return [];
    }
  }

  public get command() {
    return super.command
      .addStringOption((o) =>
        o
          .setName("message")
          .setDescription("BP Message")
          .setRequired(true)
          .setAutocomplete(false)
      )
      .addStringOption((o) =>
        o
          .setName("key")
          .setDescription("Key (optional")
          .setRequired(false)
          .setAutocomplete(false)
      )
      .addStringOption((o) =>
        o
          .setName("location")
          .setDescription("Location of the batphone")
          .setRequired(false)
          .setAutocomplete(true)
      );
  }
}

class unsetBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    const key = this.getOption("message", interaction)?.value;
    try {
      if (typeof key === "string") {
        await prismaClient.batphone.delete({
          where: {
            key: key,
          },
        });
        interaction.editReply("Removed preset message: " + key);
      } else {
        throw error;
      }
    } catch (err) {
      console.error(err);
      interaction.editReply("Failed save batphone message.");
    }
  }
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    const res = await prismaClient.batphone.findMany();

    return res.map((opt) => {
      return { name: opt.key, value: opt.message };
    });
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName("message")
        .setDescription("BP Message")
        .setRequired(true)
        .setAutocomplete(true)
    );
  }
}

class getBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    try {
      const val = this.getOption("message", interaction)?.value as string;
      const key = this.getOption("message", interaction)?.value;
      //const savedMsg = await redisClient.hGet("bp", String(val));
      const savedMsg = await prismaClient.batphone.findFirst({
        where: {
          key: val,
        },
      });
      const message = savedMsg?.message || val;
      if (typeof message === "string") {
        const formattedMessage = message.replace(
          /\\n/g,
          `
`
        );

        const replyMsg = `\`/bp send ${key}\` is set to send:

${formattedMessage}

--------
To change this message, use \`/bp unset ${key}\` and then \`/bp set\` to set a new message.
`;
        if (interaction.channel) {
          interaction.channel.send(replyMsg); // todo: send message in channel
          interaction.deleteReply();
        }
      }
    } catch (e) {
      console.error(e);
      interaction.editReply("Error: " + e);
    }
  }

  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    const res = await prismaClient.batphone.findMany();
    if (isObject(res)) {
      const opts = Object.entries(res).map(([key, value]) => ({
        name: key,
        value: key,
      }));
      return opts;
    }
    return [];
  }

  public get command() {
    return super.command.addStringOption((o) =>
      o
        .setName("message")
        .setDescription("BP Message")
        .setRequired(true)
        .setAutocomplete(true)
    );
  }
}

export const batphoneCommand = new Command(
  "bp",
  "set and send batphone messages",
  [
    new sendBp("send", "send batphone"),
    new setBp("set", "save a BP preset"),
    new unsetBp("unset", "remove BP preset"),
    new getBp("get", "show BP message in this channel"),
  ]
);
