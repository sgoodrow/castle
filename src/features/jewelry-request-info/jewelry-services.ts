import { Icon, Service } from "../bank-request-info/types";

export const services: Service[] = [
  {
    title: "Jewelry Spreadsheet",
    inventoryUrl: "https://tinyurl.com/castle-jewelry",
    icon: Icon.Jewelry,
    requestFormats: ["Item name, Item count (List of materials provided, Total cost)"],
    bullets: ["Include the total cost of the order in your request, per the spreadsheet"],
  },
];
