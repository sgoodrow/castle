import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMemberRoleManager,
} from "discord.js";
import moment from "moment";
import { client, prismaClient } from "..";
import { knightRoleId, officerRoleId } from "../config";
import { RaidValuesService } from "./raidValuesService";
import { RteType } from "@prisma/client";
import { log } from "../shared/logger";

const raidValuesService = RaidValuesService.getInstance();

export interface StartSessionInput {
  discordId: string;
  discordUsername: string;
  characterName: string;
  target: string;
  type: RteType;
  charClass?: string;
}

export interface SessionSummary {
  elapsedMinutes: number;
  roundedMinutes: number;
  dkpEarned: number;
  hourlyRate: number;
}

export const rteService = {
  startSession: async (input: StartSessionInput) => {
    const openTarget = await prismaClient.rte_target.findUnique({
      where: { target: input.target },
    });
    if (!openTarget || !openTarget.open) {
      throw new Error(`Target ${input.target} is not currently open for RTE.`);
    }

    // const existing = await prismaClient.rte.findFirst({
    //   where: {
    //     discordId: input.discordId,
    //     active: true,
    //   },
    // });
    // if (existing) {
    //   throw new Error(
    //     `You already have an active session for ${existing.target} (${existing.type}). Please end it before starting a new one.`
    //   );
    // }

    const session = await prismaClient.rte.create({
      data: {
        discordId: input.discordId,
        discordUsername: input.discordUsername,
        characterName: input.characterName,
        target: input.target,
        type: input.type,
        class: input.charClass ?? null,
        active: true,
      },
    });

    const user = await client.users.fetch(input.discordId);
    const button = new ButtonBuilder()
      .setCustomId(`rte_end_${session.id}`)
      .setLabel("End Session")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const dm = await user.send({
      content: `You have started a **${formatType(input.type)}** session for **${input.target}** on **${input.characterName}**.\n\nClick the button below to end your session when you are done.`,
      components: [row],
    });

    await prismaClient.rte.update({
      where: { id: session.id },
      data: { dmMessageId: dm.id },
    });

    raidValuesService.recordRecentEvent(input.discordId, input.target);

    return session;
  },

  endSessionById: async (sessionId: number, endedByDiscordId: string) => {
    const session = await prismaClient.rte.findUnique({
      where: { id: sessionId },
    });
    if (!session || !session.active) {
      throw new Error("Session not found or already ended.");
    }
    if (session.discordId !== endedByDiscordId) {
      throw new Error("You can only end your own session.");
    }

    const endTime = new Date();
    const summary = await calculateDkp(session, endTime);

    await prismaClient.rte.update({
      where: { id: sessionId },
      data: {
        endTime,
        active: false,
      },
    });

    const user = await client.users.fetch(session.discordId);
    await user.send({
      content: `Your **${formatType(session.type)}** session for **${session.target}** has ended.\n\n**Summary:**\n- Character: ${session.characterName}\n- Duration: ${formatDuration(summary.elapsedMinutes)}\n- Rounded Duration: ${formatDuration(summary.roundedMinutes)}\n- Hourly Rate: ${summary.hourlyRate} DKP\n- **DKP Earned: ${summary.dkpEarned.toFixed(2)}**`,
    });

    return summary;
  },

  openTarget: async (target: string, openedBy: string) => {
    await prismaClient.rte_target.upsert({
      where: { target },
      create: {
        target,
        open: true,
        openedBy,
      },
      update: {
        open: true,
        openedBy,
        openedAt: new Date(),
      },
    });
  },

  closeTarget: async (target: string) => {
    await prismaClient.rte_target.update({
      where: { target },
      data: { open: false },
    });
  },

  endSessionsForTarget: async (target: string) => {
    const sessions = await prismaClient.rte.findMany({
      where: {
        target,
        active: true,
      },
    });

    for (const session of sessions) {
      const endTime = new Date();
      const summary = await calculateDkp(session, endTime);

      await prismaClient.rte.update({
        where: { id: session.id },
        data: {
          endTime,
          active: false,
        },
      });

      try {
        const user = await client.users.fetch(session.discordId);
        await user.send({
          content: `Your **${formatType(session.type)}** session for **${session.target}** has been ended because the target was closed.\n\n**Summary:**\n- Character: ${session.characterName}\n- Duration: ${formatDuration(summary.elapsedMinutes)}\n- Rounded Duration: ${formatDuration(summary.roundedMinutes)}\n- Hourly Rate: ${summary.hourlyRate} DKP\n- **DKP Earned: ${summary.dkpEarned.toFixed(2)}**`,
        });
      } catch (err) {
        log(`Failed to DM user ${session.discordId} about closed target: ${err}`);
      }
    }

    return sessions.length;
  },

  getOpenTargets: async () => {
    return prismaClient.rte_target.findMany({
      where: { open: true },
    });
  },

  getActiveSessions: async () => {
    return prismaClient.rte.findMany({
      where: { active: true },
      orderBy: [{ target: "asc" }, { startTime: "asc" }],
    });
  },

  canManageTargets: (roles: GuildMemberRoleManager) => {
    return (
      roles.cache.has(knightRoleId) || roles.cache.has(officerRoleId)
    );
  },
};

async function calculateDkp(session: { type: RteType; startTime: Date; target: string }, endTime: Date): Promise<SessionSummary> {
  const elapsedMs = endTime.getTime() - session.startTime.getTime();
  const elapsedMinutes = elapsedMs / 1000 / 60;
  const roundedMinutes = Math.floor(elapsedMinutes / 20) * 20;

  const raidValue = await raidValuesService.getRaidValue(session.target);
  let hourlyRate = 0;
  switch (session.type) {
    case RteType.TRACK:
      hourlyRate = raidValue?.trackingHourly ?? 0;
      break;
    case RteType.RTE:
      hourlyRate = raidValue?.rteHourly ?? 0;
      break;
    case RteType.RACE:
      hourlyRate = raidValue?.racingHourly ?? 0;
      break;
  }

  const dkpEarned = (roundedMinutes / 60) * hourlyRate;

  return {
    elapsedMinutes,
    roundedMinutes,
    dkpEarned,
    hourlyRate,
  };
}

function formatType(type: RteType): string {
  switch (type) {
    case RteType.TRACK:
      return "Tracking";
    case RteType.RTE:
      return "RTE";
    case RteType.RACE:
      return "Racing";
    default:
      return type;
  }
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}
