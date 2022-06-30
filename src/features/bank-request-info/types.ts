export enum Icon {
  Bought = "📜",
  Request = "✍️",
  Sold = "🏦",
  Jewelry = "💎",
}

export interface Service {
  title: string;
  icon: string;
  requestFormats: string[];
  inventoryUrl?: string;
  bullets: string[];
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

export const Days = Object.values(Day);
