-- CreateTable
CREATE TABLE "bot" (
    "class" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "currentPilot" TEXT NOT NULL,
    "checkoutTime" TEXT NOT NULL,
    "bindLocation" TEXT NOT NULL,
    "requiredRoles" TEXT[]
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_name_key" ON "bot"("name");
