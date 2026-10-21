export enum Icon {
  Bought = "📜",
  Request = "✍️",
  Sold = "🏦",
  Jewelry = "💎",
  Raiding = "⚔️",
}

export interface Service {
  title: string;
  icon: string;
  requestFormats: string[];
  inventoryUrl?: string;
  bullets: string[];
}
