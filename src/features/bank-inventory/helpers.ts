import { bankData } from "./bank-data";

export const autoCompleteStockedItems = async (stem: string) => {
  const items = await bankData.getItemsByStem(stem);
  if(items) {
    return items
    .filter((i) => i._count.stock > 0)
    .map((i)=>({
      name: i.name + " (" + i._count.stock +  ")",
      value: String(i.id)
    }));
  }
  return []; 
}

export const autoCompleteAllItems = async (stem: string) => {
  const items = await bankData.getItemsByStem(stem);
  if(items) {
    return items
    .map((i)=>({
      name: i.name + " (" + i._count.stock +  ")",
      value: String(i.id)
    }));
  }
  return []; 
}