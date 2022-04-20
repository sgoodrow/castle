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

export declare type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";
