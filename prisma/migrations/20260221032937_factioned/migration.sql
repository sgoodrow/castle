/*
  Warnings:

  - Added the required column `factioned` to the `bot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bot" ADD COLUMN     "factioned" BOOLEAN NOT NULL;
