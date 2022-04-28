import { CacheType, CommandInteraction } from "discord.js";
import { dataSource } from "../../db/data-source";
import { Invite } from "../../db/invite";
import { Class, classes } from "../../shared/classes";
import { getOption } from "../../shared/command/command";
import { updateInviteListInfo } from "./update-action";

export enum Option {
  Name = "name",
  Class = "class",
  Level = "level",
  Main = "main",
}

export const classChoices: [name: string, value: string][] = classes.map(
  (c) => [c, c]
);

interface NewInviteOptions {
  main?: string;
  interviewed?: boolean;
}

export const newInvite = async (
  interaction: CommandInteraction<CacheType>,
  options: NewInviteOptions = {}
) => {
  const { name, level, className } = await checkInvite(interaction);

  const invite = new Invite();
  invite.name = name;
  invite.byUserId = interaction.user.id;
  if (level) {
    invite.level = Number(level);
  }
  if (className) {
    invite.class = className as Class;
  }
  const { main, interviewed } = options;

  if (main) {
    invite.main = main;
  }
  invite.interviewed = !!interviewed;

  await dataSource.manager.save(invite);
  await updateInviteListInfo(interaction.client);

  return invite;
};

const checkInvite = async (interaction: CommandInteraction<CacheType>) => {
  const name = String(getOption(Option.Name, interaction)?.value).toLowerCase();
  const className = getOption(Option.Class, interaction)?.value;
  const level = getOption(Option.Level, interaction)?.value;

  // check that the name isn't already tracked
  const invites = await dataSource.getRepository(Invite).find({
    where: [
      {
        name,
        invited: false,
        canceled: false,
      },
      {
        name,
        interviewed: false,
        canceled: false,
      },
    ],
  });
  if (invites.length) {
    throw new Error(`${name} is already being tracked.`);
  }
  return { name, level, className };
};
