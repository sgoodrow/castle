import { bankerRoleId } from "../../config";
import { redisClient } from "../../redis/client";
import { bankerInventory } from "./banker-request";
import { differenceBy } from "lodash";

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

export interface inventoryItem {
  character: string;
  name: string;
  id: string;
  location: string;
  count: number;
}

export interface bankerInventory {
  character: string;
  items: inventoryItem[];
}

export const getBankerInventory = async function (charname: string) {
  const key = "banker-inventory." + encodeURIComponent(charname.toLowerCase());
  // console.log('get banker', key)
  const serialized = await redisClient.get(key);
  // console.log(serialized);
  if (!serialized) {
    throw new Error("Banker not found: " + charname);
  }
  return JSON.parse(serialized);
};

export const setBankerInventory = async function(inventory: bankerInventory) {
  try {
    const key = "banker-inventory." + encodeURIComponent(inventory.character.toLowerCase());
    console.log("set inventory for ", key);
    await redisClient.set(key, JSON.stringify(inventory));
    return "Inventory set for " + inventory.character;
  } catch (e) {
    console.log(e);
  }
}

export async function updateBankerInventory(inventory: bankerInventory) {
  try {
    const cachedInventory = await getBankerInventory(inventory.character);    
    const diff = differenceBy(cachedInventory.items, inventory.items, "name");
    console.log(diff);
    if(diff && diff.length > 0) {
      diff.forEach((item:any) => {  // typescript hates me.
        removeBankItem(item);
      })
    }
  } catch (e: any) {
    console.log(e.message);
  }
  return await setBankerInventory(inventory);
}

export const getBankItem = async function (itemName: string) {
  const serialized = await redisClient.get(
    "bank-item." + encodeURIComponent(itemName)
  );
  // console.log(serialized);
  if (!serialized) {
    throw new Error("Item not found: " + itemName);
  }
  return new BankItem(JSON.parse(serialized));
};

export const addBankItem = async function (inventoryItem: inventoryItem) {
  let item: BankItemData = {
    name: inventoryItem.name,
    id: inventoryItem.id,
    stock: [
      {
        character: inventoryItem.character,
        location: inventoryItem.location,
        count: inventoryItem.count,
      },
    ],
  };
  try {
    const cachedItem = await getBankItem(item.name);
    const matchStock = cachedItem.itemData.stock.find(
      (s) => s.character === inventoryItem.character
    );
    // console.log(matchStock);
    if (!matchStock) {
      cachedItem.itemData.stock.push(item.stock[0]);
      item = cachedItem.itemData;
    } else {
      // console.log(item.name + ": Item stock accounted for.");
    }
  } catch (e: any) {
    console.log(e.message);
  }
  const key = "bank-item." + encodeURIComponent(item.name);
  // console.log("set", key, item);
  try {
    await redisClient.set(key, JSON.stringify(item));
  } catch (e) {
    console.log(e);
  }
};

export const removeBankItem = async function(inventoryItem: inventoryItem) {
  // remove item stock if banker matches
  try {
    const cachedItem = await getBankItem(inventoryItem.name);
    const matchIdx = cachedItem.itemData.stock.findIndex(
      (s) => s.character === inventoryItem.character
    );
    if (matchIdx > -1) {
      cachedItem.itemData.stock.splice(matchIdx, 1);
      const key = "bank-item." + encodeURIComponent(cachedItem.itemData.name);
      // console.log("removed match", key, cachedItem);
      await redisClient.set(key, JSON.stringify(cachedItem));
    }
  } catch (e: any) {
    console.log(e.message);
  }
}

export class BankItem {
  public countAvailable: number;
  public itemData: BankItemData;
  public constructor(itemData: BankItemData) {
    this.itemData = itemData;
    this.countAvailable = itemData.stock.length;
  }
}
