-- CreateTable
CREATE TABLE "DsEntry" (
    "id" SERIAL NOT NULL,
    "discordId" TEXT NOT NULL,
    "timeIn" TIMESTAMP(3) NOT NULL,
    "timeOut" TIMESTAMP(3),
    "adjustment" INTEGER,
    "total" INTEGER,

    CONSTRAINT "DsEntry_pkey" PRIMARY KEY ("id")
);
