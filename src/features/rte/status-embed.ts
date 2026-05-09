import { EmbedBuilder } from "discord.js";
import { trackingStatusChannelId } from "../../config";
import { Name } from "../../db/instructions";
import { InstructionsReadyAction } from "../../shared/action/instructions-ready-action-2";
import { readyActionExecutor, Options } from "../../shared/action/ready-action-2";
import { rteService } from "../../services/rteService";
import { RteType } from "@prisma/client";
import moment from "moment";
import { log } from "../../shared/logger";

export const rteStatusInstructions = new InstructionsReadyAction(
  Name.RteStatusEmbed,
  trackingStatusChannelId
);

export const updateRteStatusEmbed = (options: Options) => {
  readyActionExecutor(async () => {
    await refreshRteStatusEmbed();
  }, options);
};

const typeIcon = (type: RteType) => {
  switch (type) {
    case RteType.TRACK:
      return "👁️";
    case RteType.RTE:
      return "⚔️";
    case RteType.RACE:
      return "🏁";
    default:
      return "❓";
  }
};

export const refreshRteStatusEmbed = async () => {
  const openTargets = await rteService.getOpenTargets();
  const activeSessions = await rteService.getActiveSessions();

  const embed = new EmbedBuilder({
    title: `RTE Status — last updated ${moment().format("h:mm:ss A")}`,
    description:
      openTargets.length === 0
        ? "No targets are currently open for RTE."
        : undefined,
  });

  for (const target of openTargets) {
    const sessions = activeSessions.filter((s) => s.target === target.target);
    let value: string;
    if (sessions.length === 0) {
      value = "*No active sessions*";
    } else {
      value = sessions
        .map((s) => {
          const elapsed = moment.duration(moment().diff(s.startTime));
          const elapsedStr = `${Math.floor(elapsed.asHours())}h ${elapsed.minutes()}m`;
          return `${typeIcon(s.type)} **${s.characterName}**${s.class ? ' - ' + s.class : ''} (<@${s.discordId}>) — ${elapsedStr}`;
        })
        .join("\n");
    }

    embed.addFields({
      name: target.target,
      value,
      inline: false,
    });
  }

  await rteStatusInstructions
    .createOrUpdateInstructions({ embeds: [embed] })
    .catch((reason) => {
      log(`RTE status embed update failed: ${reason}`);
    });
};
