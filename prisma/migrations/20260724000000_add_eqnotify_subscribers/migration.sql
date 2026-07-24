-- CreateEnum
CREATE TYPE "eqnotify_type" AS ENUM ('wire', 'telegram');

-- CreateTable
CREATE TABLE "eqnotify_subscriber" (
    "discordId" VARCHAR NOT NULL,
    "discordUsername" VARCHAR NOT NULL,
    "contact" VARCHAR NOT NULL,
    "type" "eqnotify_type" NOT NULL DEFAULT 'wire',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eqnotify_subscriber_pkey" PRIMARY KEY ("discordId")
);
