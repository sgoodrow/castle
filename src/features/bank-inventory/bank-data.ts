// use Prisma to interface with postgres db. 
// see prisma/schema.prisma

import { PrismaClient } from '@prisma/client'

export interface InventoryItem {
  character: string;
  name: string;
  id: number;
  location: string;
  count: number;
}

export interface Inventory {
  charName: string;
  charType: string;
  items: InventoryItem[];
}

class BankData {
  private prisma;

  constructor() {
    this.prisma = new PrismaClient()
  }

  public async setInventory(inventory: Inventory): Promise<void> {
    try {
      const upsertChar = await this.prisma.char.upsert({
        where: {
          name: inventory.charName,
        },
        create: {
          name: inventory.charName,
          charType: inventory.charType,
        },
        update: {
          charType: inventory.charType,
        }
      })
    } catch (e) {
      console.error('character not created', e)
    }
    
    for (let item of inventory.items) {
      try {
        const upsertItem = await this.prisma.item.upsert({
          where: {
            id: item.id
          },
          create: {
            id: item.id,
            name: item.name
          },
          update: {
            name: item.name
          }
        })
      } catch(e) {
        console.error(e)
      }
      
      try {
        const upsertSlot = await this.prisma.slot.upsert({
          where: {
            charSlot: String(inventory.charName + item.location)
          },
          update: {
            itemId: item.id,
            count: item.count
          },
          create: {
            slot: item.location,
            charSlot: String(inventory.charName + item.location),
            charName: inventory.charName,
            itemId: item.id,
            count: item.count
          }
        })
      } catch(e) {
        console.error(e)
      }
    }
  }

  public async getItemsByStem(itemStem: string) {
    return await this.prisma.item.findMany({
      where: {
        name: {
          startsWith: itemStem,
          mode: 'insensitive'
        }
      },
      include: {
          _count: { 
            select: {
              stock: true
            }
        }
      }
    }).catch((err: Error) => {
      console.error(err);
    });
  }

  public async getItemsByName(itemName: string) {
    return await this.prisma.item.findMany({
      where: {
        name: {
          equals: itemName
        }
      },
      include: {
          _count: { 
            select: {
              stock: true
            }
        }
      }
    }).catch((err: Error) => {
      console.error(err);
    });
  }

  public async getItemStockById(itemId: number) {
    return await this.prisma.item.findFirst({
      where: {
        id: {
          equals: itemId
        }
      },
      include: {
        stock: true
      }
    }).catch((err: Error) => {
      console.error(err);
    });
  }

  public async getInventory(charName: string) {
    return await this.prisma.char.findFirst({
      where: {
        name: {
          equals: charName
        }
      },
      include: {
        inventory: true
      }
    }).catch((err: Error) => {
      console.error(err);
    });
  }
}

export const bankData = new BankData();