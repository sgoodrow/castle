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
  requestFormats: string[];
  inventoryUrl?: string;
  bullets: string[];
}
