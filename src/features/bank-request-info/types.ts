export enum Icon {
  Bought = "📜",
  Request = "✍️",
  Sold = "🏦",
  Money = "💰",
  Jewelry = "💎",
}

export interface Service {
  title: string;
  icon: string;
  inventoryUrl?: string;
  bullets: string[];
}

// Jewelry still shows members how to type a request.
export interface JewelryService extends Service {
  requestFormats: string[];
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
