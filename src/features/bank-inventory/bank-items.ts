import { redisClient } from "../../redis/client";

interface BankItemData {
  name: string;
  id: string;
  stock: [
    {
      character: string;
      location: string;
      count: number;
    }
  ];
}

export const getBankItem = async function (itemName: string) {
  const serialized = await redisClient.get(
    "bank-item." + encodeURIComponent(itemName)
  );
  console.log(serialized);
  if (!serialized) {
    throw new Error("Item not found: " + itemName);
  }
  return new BankItem(JSON.parse(serialized));
};

export const setBankItem = async function (character: string, rowStr: string) {
  const row = rowStr.split("\t");
  if (!row[1] || row[1] === "Empty") {
    return;
  }

  let item: BankItemData = {
    name: row[1],
    id: row[2],
    stock: [
      {
        character: character,
        location: row[0],
        count: parseInt(row[3]),
      },
    ],
  };
  try {
    const cachedItem = await getBankItem(item.name);
    const matchStock = cachedItem.itemData.stock.find(
      (s) => s.character === character
    );
    // console.log(matchStock);
    if (!matchStock) {
      cachedItem.itemData.stock.push(item.stock[0]);
      item = cachedItem.itemData;
    } else {
      console.log(item.name + ": Item stock accounted for.");
    }
  } catch (e: any) {
    console.log(e.message);
    const key = "bank-item." + encodeURIComponent(item.name);
    console.log("set", key, item);
    // todo: should maybe use redis.multi() instead and refactor
    try {
      await redisClient.set(key, JSON.stringify(item));
    } catch (e) {
      console.log(e);
    }
  }
};

export class BankItem {
  public countAvailable: number;
  public itemData: BankItemData;
  public constructor(itemData: BankItemData) {
    this.itemData = itemData;
    this.countAvailable = itemData.stock.length;
  }
}
