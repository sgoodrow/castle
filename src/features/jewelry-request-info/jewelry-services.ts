import { Icon, Service } from "../bank-request-info/types";

export const services: Service[] = [
  {
    title: "Jewelry Spreadsheet",
    inventoryUrl:
      "https://docs.google.com/spreadsheets/d/1_Wqh3A_0Wg0JN4Fbt06j51yUqUZVKcVDLbSzzJ9FI4k/edit?usp=sharing",
    icon: Icon.Jewelry,
    requestFormats: ["Item name, Item count (List of materials provided, Total cost)"],
    bullets: ["Include the total cost of the order in your request, per the spreadsheet"],
  },
];
