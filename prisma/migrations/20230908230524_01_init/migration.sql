-- AlterTable
ALTER TABLE "typeorm_metadata" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "typeorm_metadata_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "item" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot" (
    "id" SERIAL NOT NULL,
    "charSlot" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "charName" TEXT NOT NULL,
    "itemId" INTEGER,
    "count" INTEGER,

    CONSTRAINT "slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "char" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "charType" TEXT NOT NULL,

    CONSTRAINT "char_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_charSlot_key" ON "slot"("charSlot");

-- CreateIndex
CREATE UNIQUE INDEX "char_name_key" ON "char"("name");

-- AddForeignKey
ALTER TABLE "slot" ADD CONSTRAINT "slot_charName_fkey" FOREIGN KEY ("charName") REFERENCES "char"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot" ADD CONSTRAINT "slot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
