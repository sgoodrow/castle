import { BankerHour, Day } from "./types";
import moment from "moment";

// todo: store this in database, populate and remove with command
const rawBankerHours: {
  banker: string;
  day: Day;
  hour: number;
  pm?: boolean;
}[] = [
  {
    banker: "403050155965939713", // Kindarien
    day: "Monday",
    hour: 11,
  },
  {
    banker: "403050155965939713", // BecauseICan
    day: "Wednesday",
    hour: 7,
    pm: true,
  },
  {
    banker: "403050155965939713", // Scruggs
    day: "Thursday",
    hour: 4,
    pm: true,
  },
  {
    banker: "403050155965939713", // Woodsmark
    day: "Friday",
    hour: 10,
  },
];

const nextDay = (day: Day) => {
  const dayIndex =
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].indexOf(day) + 1;
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

export const bankerHours: BankerHour[] = rawBankerHours
  .map(({ banker, day, hour, pm }) => ({
    banker,
    date: getNextBankerHour(day, hour, pm),
  }))
  .sort((a, b) => (a.date > b.date ? 1 : -1));
