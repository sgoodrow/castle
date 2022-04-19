import { BankerHour } from "./types";

// todo: store this in database, populate and remove with command
export const bankerHours: BankerHour[] = [
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
