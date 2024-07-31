import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction,
} from "discord.js";
import { Command } from "../../shared/command/command";
import { Subcommand } from "../../shared/command/subcommand";
import { getTextChannel } from "../..";
import { batphoneChannelId, raiderRoleId, wakeupChannelId } from "../../config";
import { authorizeByMemberRoles } from "../../shared/command/util";
import { officerRoleId, modRoleId, knightRoleId } from "../../config";
import { kStringMaxLength } from "buffer";
import { error } from "console";
import { redisClient } from "../../redis/client";
import { redis } from "googleapis/build/src/apis/redis";
import { isObject } from "lodash";
import { container } from "tsyringe";
import { WakeupService } from "../wakeup/wakeup.service";
import { truncate } from "lodash";

class sendBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );
    const bpChannel = await getTextChannel(batphoneChannelId);
    const val = this.getOption("message", interaction)?.value;
    const savedMsg = await redisClient.hGet("bp", String(val));
    const message = savedMsg || val;
    if (typeof message === "string") {
      const formattedMessage = message.replace(/\\n/g, `
`);
      await bpChannel.send({
        content: `[${interaction.user}] <@&${raiderRoleId}> 
` + formattedMessage,
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
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
    ApplicationCommandOptionChoiceData<string | number>[] | undefined
  > {
    const res = await getBpOptions();
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

class setBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    let message = this.getOption("message", interaction)?.value;
    try {
      if (typeof message === "string") {
        if (message.length > 2000) { // max message length is 2000 chars
          throw new Error("Message is too long.");
        }
        let key = this.getOption("key", interaction)?.value;
        if (!key) {
          key = message.split(" ")[0].toLowerCase();
        }
        key = truncate(String(key), { length: 100}) // max option length = 100
        await redisClient.hSet("bp", String(key), message);
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
    return [];
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
        await redisClient.hDel("bp", String(key));
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
    const res = await getBpOptions();
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

class getBp extends Subcommand {
  public async execute(interaction: CommandInteraction<CacheType>) {
    // authorize
    authorizeByMemberRoles(
      [officerRoleId, modRoleId, knightRoleId],
      interaction
    );

    try {
      const val = this.getOption("message", interaction)?.value;
      const key = this.getOption("message", interaction)?.value;
      const savedMsg = await redisClient.hGet("bp", String(val));
      const message = savedMsg || val;
      if (typeof message === "string") {
        const formattedMessage = message.replace(/\\n/g, `
`);

  const replyMsg = `\`/bp send ${key}\` is set to send:

${formattedMessage}

--------
To change this message, use \`/bp unset ${key}\` and then \`/bp set\` to set a new message.
`
    if (interaction.channel){
      interaction.channel.send(replyMsg) // todo: send message in channel
    }

  }
  
    } catch(e){
      console.error(e);
      interaction.editReply('Error: ' + e);
    }

  }
  
  public async getOptionAutocomplete(
    option: string,
    interaction: AutocompleteInteraction<CacheType>
  ): Promise<
      ApplicationCommandOptionChoiceData<string | number>[] | undefined
    > {
    const res = await getBpOptions();
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

const getBpOptions = async () => {
  try {
    const res = await redisClient.hGetAll("bp");
    return res;
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const batphoneCommand = new Command(
  "bp",
  "set and send batphone messages",
  [
    new sendBp("send", "send batphone"),
    new setBp("set", "save a BP preset"),
    new unsetBp("unset", "remove BP preset"),
    new getBp("get", "show BP message in this channel")
  ]
);
