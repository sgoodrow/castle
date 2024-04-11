-- CreateEnum
CREATE TYPE "bank_item_types" AS ENUM ('dropped_spell', 'research_spell', 'research_component', 'sky_droppable', 'for_sale', 'rechargeable', 'raid_reagent', 'not_available');

-- AlterTable
ALTER TABLE "item" ADD COLUMN     "price" TEXT,
ADD COLUMN     "type" "bank_item_types";
