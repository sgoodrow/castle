import {
  CacheType,
  CommandInteraction,
  GuildMemberRoleManager,
  ClientVoiceManager,
  GuildBasedChannel,
  VoiceBasedChannel,
  VoiceChannel,
  Guild,
  InteractionResponseType,
} from "discord.js";
import {
  AudioPlayerStatus,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { IWakeupService } from "./wakeup.service.i";
import { singleton } from "tsyringe";
import { redisClient } from "../../redis/client";
import { authorizeByMemberRoles } from "../../shared/command/util";
import { wakeupChannelId } from "../../config";
import { client, getGuild } from "../..";
import ytdl from "ytdl-core";

@singleton()
export class WakeupService implements IWakeupService {
  wakeupChannel: VoiceChannel | null = null;
  guild: Guild | null = null;
  constructor() {
    this.init();
  }
  async init() {
    this.guild = await getGuild();
    const channel = await this.guild.channels.fetch(wakeupChannelId, {
      force: true,
    });
    if (channel?.isVoiceBased()) {
      this.wakeupChannel = channel as VoiceChannel;
    } else {
      throw new Error(`${wakeupChannelId} is not a voice channel`);
    }
  }
  async runWakeup(textMessage: string) {
    if (this.wakeupChannel !== null) {
      // Join voice
      const voiceConnection = joinVoiceChannel({
        channelId: this.wakeupChannel.id,
        guildId: this.wakeupChannel.guildId,
        adapterCreator: this.wakeupChannel.guild.voiceAdapterCreator,
      });

      voiceConnection.on(
        VoiceConnectionStatus.Ready,
        async (oldState, newState) => {
          try {
            // First TTS
            this.wakeupChannel?.send({
              content: textMessage,
              tts: true,
            });

            // Play wakeup song
            let songUrl = await redisClient.hGet("wakeup", "song");
            if (!songUrl) {
              songUrl = "https://youtu.be/enYdAxVcNZA?t=12";
            }

            const stream = ytdl(songUrl, {
              filter: "audioonly",
            });
            const resource = createAudioResource(stream, {
              inputType: StreamType.Arbitrary,
            });
            const player = createAudioPlayer();

            player.play(resource);
            voiceConnection.subscribe(player);

            await setTimeout(() => {
              player.stop(true);
            }, 10000);

            // Second TTS message
            this.wakeupChannel?.send({
              content: textMessage,
              tts: true,
            });

            // Leave channel
            voiceConnection.destroy();
          } catch (error: unknown) {
            console.log(`Error during wakeup: ${error}`);
          }
        }
      );
    }
  }
}
