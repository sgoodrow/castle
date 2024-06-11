-- CreateEnum
CREATE TYPE "bank_hour_day_enum" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- CreateTable
CREATE TABLE "bank_hour" (
    "id" SERIAL NOT NULL,
    "userId" VARCHAR NOT NULL,
    "day" "bank_hour_day_enum" NOT NULL,
    "hour" INTEGER NOT NULL,

    CONSTRAINT "PK_e4f0bb9596fa3c66b3c81ea0a4f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructions" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "canceled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PK_1695991f6159e4ae33b136a67ef" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_simple" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discordId" VARCHAR NOT NULL,
    "alt" BOOLEAN,

    CONSTRAINT "PK_aae080d6a7a122487d8d6864508" PRIMARY KEY ("id")
);

