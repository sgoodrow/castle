import { bankerRoleId } from "../../config";
import { redisClient } from "../../redis/client";
import { bankerInventory } from "./banker-request";
import { differenceBy, isMatch } from "lodash";

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

export class BankItem {
  public constructor(public readonly data: BankItemData) {
    this.data = data;
  }
  get countAvailable () {
    let available = 0;
    this.data.stock.forEach((val) => {
      available = available + val.count;
    })
    return available;
  }
  // add prices?
}

export const updateBankItem = async function(inventoryItem: InventoryItem) {
  // console.log('update bank item', inventoryItem.name)
  try {
    const cachedInventoryItem = await getInventoryItem(inventoryItem);
    // console.log('Inventory item cached.')
    if(isMatch(cachedInventoryItem, inventoryItem)) {
      // console.log("Cache matches, no update necessary.");
    } else {
      // console.log("Cache doesn't match: set new inventory, remove bankItem.")
      await setInventoryItem(inventoryItem);
      await removeBankStock(inventoryItem);
    }
  } catch (e: unknown) {
    // console.log("Item not found in cache.")
    await setInventoryItem(inventoryItem);
    await addBankStock(inventoryItem);
  }
}

export const getBankItem = async (itemName: string) => {
  const serialized = await redisClient.get(itemKey(itemName));
  // console.log(serialized);
  if (!serialized) {
    throw new Error("Item not found: " + itemName);
  }
  return new BankItem(JSON.parse(serialized));
};

const inventoryItemKey = function (item: InventoryItem) {
  return 'c:' + item.character.toLowerCase() 
  + ":l:" + item.location.toLowerCase();
}

const setInventoryItem = async function(item: InventoryItem) {
  return await redisClient.set(inventoryItemKey(item),  JSON.stringify(item));
}

const getInventoryItem = async (item: InventoryItem) => {
  const serialized = await redisClient.get(inventoryItemKey(item));
  if (!serialized) { throw new Error ("Iventory item not found.")}
  return JSON.parse(serialized);
}


function itemKey(itemName: string) {
  return "bi:" + encodeURIComponent(itemName.toLowerCase())
}

const setBankItem = async (bankItemData: BankItemData) => {
  try {
    // console.log("Set bank item:", bankItemData);
    await redisClient.set(itemKey(bankItemData.name), JSON.stringify(bankItemData));
  } catch (e) {
    console.log(e);
  }
}

const pushToItemsSet = async (name: string) => {
  await redisClient.sAdd('set:bank-items', name);
}

export const getItemsSet = async () => {
  return await redisClient.sMembers('set:bank-items');
}

const addBankStock = async (inventoryItem: InventoryItem) => {
  if(inventoryItem.name === "Empty") { return; }
  try { 
    const bankItem = await getBankItem(inventoryItem.name);
    // bank item found, add inventory to stock
    // console.log('add stock: ', inventoryItem.name);
    bankItem.data.stock.push(inventoryItem);
    setBankItem(bankItem.data);
  } catch (e: any) {
    // console.log("create new bank item: ", inventoryItem.name)
    // bank item not found, create it
    const newItem: BankItemData = {
      name: inventoryItem.name,
      id: inventoryItem.id,
      price: '',
      stock: [
        {
          character: inventoryItem.character,
          location: inventoryItem.location,
          count: inventoryItem.count,
        },
      ],
    };
    pushToItemsSet(newItem.name);
    setBankItem(newItem);
  }

};

const removeBankStock= async function(inventoryItem: InventoryItem) {
  try {
    const bankItem = await getBankItem(inventoryItem.name);
    const matchIdx = bankItem.data.stock.findIndex(
      (s) => isMatch(s, inventoryItem)
    );
    if (matchIdx > -1) {
      bankItem.data.stock.splice(matchIdx, 1);
      console.log("Remove stock:", bankItem.data.name);
      await setBankItem(bankItem.data);
    }
  } catch (e: any) {
    console.log(e.message);
  }
}

async function test() {
  const itemsSet = await getItemsSet();
  console.log(itemsSet);
}
test();