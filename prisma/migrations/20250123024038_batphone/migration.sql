-- CreateTable
CREATE TABLE "batphone" (
    "key" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "message" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "batphone_key_key" ON "batphone"("key");
