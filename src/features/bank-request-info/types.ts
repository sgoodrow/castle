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
  bulletContent: string[];
}

export interface BankerHour {
  banker: string;
  day: Day;
  hour: number;
  pm?: boolean;
}

export declare type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";
