import { VoiceChannel, Guild } from "discord.js";
import {
  AudioResource,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { IWakeupService } from "./wakeup.service.i";
import { autoInjectable } from "tsyringe";
import { wakeupChannelId } from "../../config";
import { getGuild } from "../..";
import { redisClient } from "../../redis/client";
import ytdl from "ytdl-core";
import internal from "stream";

@autoInjectable()
export class WakeupService implements IWakeupService {
  wakeupChannel: VoiceChannel | null = null;
  guild: Guild | null = null;

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
    await this.init();
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
            const player = createAudioPlayer();

            // Play wakeup song
            let songUrl = await redisClient.hGet("wakeup", "song");
            if (!songUrl) {
              songUrl = "media/daddychill.mp3";
            }

            let audio: string | internal.Readable | undefined = undefined;
            if (songUrl.includes("youtu")) {
              audio = ytdl(songUrl, {
                filter: "audioonly",
              });
            } else if (songUrl.includes(".mp3")) {
              audio = songUrl;
            }

            if (!audio) {
              throw new Error("No valid audio provided");
            }

            const resource = createAudioResource(audio, {
              inputType: StreamType.Arbitrary,
            });

            voiceConnection.subscribe(player);
            player.play(resource);

            setTimeout(async () => {
              player.stop(true);
              // Leave channel
              voiceConnection.destroy();
            }, 20000);
          } catch (error: unknown) {
            console.log(`Error during wakeup: ${error}`);
          }
        }
      );
    }
  }
}
