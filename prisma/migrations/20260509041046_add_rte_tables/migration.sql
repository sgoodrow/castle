-- CreateEnum
CREATE TYPE "RteType" AS ENUM ('TRACK', 'RTE', 'RACE');

-- CreateTable
CREATE TABLE "rte" (
    "id" SERIAL NOT NULL,
    "discordId" VARCHAR NOT NULL,
    "discordUsername" VARCHAR NOT NULL,
    "characterName" VARCHAR NOT NULL,
    "target" VARCHAR NOT NULL,
    "type" "RteType" NOT NULL,
    "class" VARCHAR,
    "startTime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "dmMessageId" VARCHAR,

    CONSTRAINT "rte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rte_target" (
    "target" VARCHAR NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "openedBy" VARCHAR NOT NULL,
    "openedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rte_target_pkey" PRIMARY KEY ("target")
);
