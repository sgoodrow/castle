import { ChatInputCommandInteraction, CacheType } from "discord.js";
import { SimpleCommand } from "../../../shared/command/simple-command";
import { formatDateShort } from "./helpers/format";
import { parseTime } from "./parsers/time-parser";
import { timerPrismaClient } from "../../../db/timer-client";

class LeaderboardCommand extends SimpleCommand {
  public get command() {
    return super.command
      .addStringOption((opt) =>
        opt
          .setName("start_date")
          .setDescription("Start date filter (e.g. \"2 weeks ago\")")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("end_date")
          .setDescription("End date filter (e.g. \"yesterday\")")
          .setRequired(false)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction<CacheType>) {
    const startDateStr = interaction.options.getString("start_date");
    const endDateStr = interaction.options.getString("end_date");

    const lines: string[] = [];

    const startAt = startDateStr ? parseTime(startDateStr) : null;
    const endAt = endDateStr ? parseTime(endDateStr) : null;

    if (startDateStr && !startAt) {
      await interaction.editReply({
        content: "Unable to parse start date.",
      });
      return;
    }

    if (endDateStr && !endAt) {
      await interaction.editReply({
        content: "Unable to parse end date.",
      });
      return;
    }

    if (startAt && endAt) {
      lines.push(
        `Showing leaderboard from ${formatDateShort(startAt)} to ${formatDateShort(endAt)}`
      );
    } else if (startAt) {
      lines.push(`Showing leaderboard since ${formatDateShort(startAt)}`);
    } else if (endAt) {
      lines.push(`Showing leaderboard ending ${formatDateShort(endAt)}`);
    } else {
      lines.push("Showing All-time leaderboard");
    }
    lines.push("");

    // Build where clause for date filtering
    const whereClause: any = {
      displayName: { not: null },
    };

    if (startAt) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        gte: startAt,
      };
    }

    if (endAt) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: endAt,
      };
    }

    // Group by userId and count
    const tods = await timerPrismaClient.tod.groupBy({
      by: ["userId"],
      _count: { userId: true },
      where: whereClause,
      orderBy: { _count: { userId: "desc" } },
      take: 20,
    });

    if (tods.length === 0) {
      lines.push("```");
      lines.push("There have been no TODs recorded during that time.");
      lines.push("```");
    } else {
      // Get display names for each user
      const userNames = new Map<string, string>();
      for (const tod of tods) {
        if (tod.userId) {
          const latestTod = await timerPrismaClient.tod.findFirst({
            where: { userId: tod.userId },
            orderBy: { createdAt: "desc" },
            select: { displayName: true },
          });
          if (latestTod?.displayName) {
            userNames.set(tod.userId, latestTod.displayName);
          }
        }
      }

      lines.push("```");
      lines.push(`Rank  ${"Name".padEnd(30)}Count`);

      tods.forEach((tod, index) => {
        const name = (userNames.get(tod.userId ?? "") ?? "Unknown").slice(0, 29);
        const rank = String(index + 1).padStart(4);
        lines.push(`${rank}  ${name.padEnd(30)}${tod._count.userId}`);
      });

      lines.push("```");
    }

    await interaction.editReply({ content: lines.join("\n") });
  }
}

export const leaderboardCommand = new LeaderboardCommand("leaderboard", "Display leaderboard of TOD recordings by user");
