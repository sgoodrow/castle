import { VoiceChannel, Guild } from "discord.js";
import {
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import { IWakeupService } from "./wakeup.service.i";
import { autoInjectable, singleton } from "tsyringe";
import { wakeupChannelId } from "../../config";
import { getGuild } from "../..";

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
            const player = createAudioPlayer();
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const discordTTS = require("discord-tts");
            const message = discordTTS.getVoiceStream(textMessage);
            const tts = createAudioResource(message, {
              inputType: StreamType.Arbitrary,
              inlineVolume: false,
            });
            player.play(tts);

            // Play wakeup song
            // let songUrl = await redisClient.hGet("wakeup", "song");
            // if (!songUrl) {
            //   songUrl = "https://youtu.be/enYdAxVcNZA?t=12";
            // }

            // const stream = ytdl(songUrl, {
            //   filter: "audioonly",
            // });
            // const resource = createAudioResource(stream, {
            //   inputType: StreamType.Arbitrary,
            // });
            
            const resource = createAudioResource("media/daddychill.mp3");

            voiceConnection.subscribe(player);
            player.play(resource);

            setTimeout(async () => {
              player.stop(true);
              // Second TTS message

              // Leave channel
              voiceConnection.destroy();
            }, 10000);
          } catch (error: unknown) {
            console.log(`Error during wakeup: ${error}`);
          }
        }
      );
    }
  }
}
