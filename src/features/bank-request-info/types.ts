export enum Icon {
  Bought = "📜",
  Request = "✍️",
  Sold = "🏦",
}

export interface Service {
  title: string;
  icon: string;
  requestFormats: string[];
  inventoryUrl?: string;
  bullets: string[];
}

export interface BankerHour {
  banker: string;
  date: number;
}

export enum Day {
  Monday = "Monday",
  Tuesday = "Tuesday",
  Wednesday = "Wednesday",
  Thursday = "Thursday",
  Friday = "Friday",
  Saturday = "Saturday",
  Sunday = "Sunday",
}
