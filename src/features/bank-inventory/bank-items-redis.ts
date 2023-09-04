
// DEPRECATED - temp for reference

import { redisClient } from "../../redis/client";
import { isMatch } from "lodash";

interface BankItemData {
  name: string;
  id: string;
  price: string;
  stock: [
    {
      character: string;
      location: string;
      count: number;
    }
  ];
}

export interface InventoryItem {
  character: string;
  name: string;
  id: string;
  location: string;
  count: number;
}

export interface BankInventory {
  banker: string;
  items: InventoryItem[];
}

export class BankItem {
  public constructor(public readonly data: BankItemData) {
    this.data = data;
  }
  get countAvailable() {
    let available = 0;
    this.data.stock.forEach((val) => {
      available = available + val.count;
    });
    return available;
  }
  // add prices?
}

export const updateBankItems = async (newInventory: BankInventory) => {
  try {
    const cachedInventory = await getBankInventory(newInventory.banker);
    if (isMatch(cachedInventory, newInventory)) {
      return;
    }
    newInventory.items.forEach((newItem) => {
      const cachedItem = cachedInventory.items.find(
        (cachedItem: InventoryItem) => {
          return newItem.location === cachedItem.location;
        }
      );
      if (cachedItem) {
        // inventory slot exists in cache
        if (
          cachedItem.name !== newItem.name ||
          cachedItem.count !== newItem.count
        ) {
          removeBankStock(cachedItem);
        }
      }
      if (!isMatch(cachedItem, newItem) && newItem.name !== "Empty") {
        addBankStock(newItem);
      }
    });
  } catch (err) {
    // try to add all if inventory is not cached.
    newInventory.items.forEach((item) => {
      addBankStock(item);
    });
  }
  setBankInventory(newInventory);
};

export const updateItemsSet = async (set: string[]) => {
  await redisClient.sAdd("set:bank-items", set);
};

export const getBankItem = async (itemName: string) => {
  const serialized = await redisClient.get(itemKey(itemName));
  if (!serialized) {
    throw new Error("Item not found: " + itemName);
  }
  return new BankItem(JSON.parse(serialized));
};

const bankInventoryKey = (banker: string) =>
  "bank:inventory:" + banker.toLowerCase();

const getBankInventory = async (banker: string) => {
  const serialized = await redisClient.get(bankInventoryKey(banker));
  if (!serialized) {
    throw new Error("Iventory item not found.");
  }
  return JSON.parse(serialized);
};

const setBankInventory = async (inventory: BankInventory) =>
  await redisClient.set(
    bankInventoryKey(inventory.banker),
    JSON.stringify(inventory)
  );

const itemKey = (itemName: string) =>
  "bi:" + encodeURIComponent(itemName.toLowerCase());

const setBankItem = async (bankItemData: BankItemData) => {
  try {
    await redisClient.set(
      itemKey(bankItemData.name),
      JSON.stringify(bankItemData)
    );
  } catch (e) {
    console.error(e);
  }
};

export const getItemsSet = async () => {
  return await redisClient.sMembers("set:bank-items");
};

const addBankStock = async (inventoryItem: InventoryItem) => {
  if (inventoryItem.name === "Empty") {
    return;
  }
  try {
    const bankItem = await getBankItem(inventoryItem.name);
    // bank item found, add inventory to stock if not already there.
    if (
      !bankItem.data.stock.find((s) => {
        return isMatch(s, inventoryItem);
      })
    ) {
      bankItem.data.stock.push(inventoryItem);
      setBankItem(bankItem.data);
    }
  } catch (e) {
    // bank item not found, create it
    const newItem: BankItemData = {
      name: inventoryItem.name,
      id: inventoryItem.id,
      price: "",
      stock: [
        {
          character: inventoryItem.character,
          location: inventoryItem.location,
          count: inventoryItem.count,
        },
      ],
    };
    setBankItem(newItem);
  }
};

const removeBankStock = async (inventoryItem: InventoryItem) => {
  try {
    const bankItem = await getBankItem(inventoryItem.name);
    const matchIdx = bankItem.data.stock.findIndex((s) =>
      isMatch(s, inventoryItem)
    );
    if (matchIdx > -1) {
      bankItem.data.stock.splice(matchIdx, 1);
      await setBankItem(bankItem.data);
    }
  } catch (e) {
    console.error(e);
  }
};
