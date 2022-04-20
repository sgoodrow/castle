import { BankerHour, Day } from "./types";
import moment from "moment";
import { Banker } from "../../db/banker";

export const days = Object.values(Day);

const nextDay = (day: Day) => {
  const dayIndex = days.indexOf(day) + 1;
  return moment().isoWeekday() <= dayIndex
    ? moment().isoWeekday(dayIndex)
    : moment().add(1, "weeks").isoWeekday(dayIndex);
};

const getNextBankerHour = (day: Day, hour: number, pm = false) =>
  nextDay(day)
    .hour(hour + (pm ? 0 : 12))
    .minute(0)
    .second(0)
    .unix();

export const getBankerHours = (rawBankerHours: Banker[]): BankerHour[] =>
  rawBankerHours
    .map(({ userId, day, hour, pm }) => ({
      banker: userId,
      date: getNextBankerHour(day, hour, pm),
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
