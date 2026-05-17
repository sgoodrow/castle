-- CreateTable
CREATE TABLE "timers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "window_start" TEXT,
    "window_end" TEXT,
    "variance" TEXT,
    "alerted" BOOLEAN,
    "last_tod" DOUBLE PRECISION,
    "alerting_soon" BOOLEAN NOT NULL DEFAULT false,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "auto_tod" BOOLEAN NOT NULL DEFAULT false,
    "linked_timer_id" INTEGER,
    "clear_parent_timer_id" INTEGER,
    "warn_time" TEXT,

    CONSTRAINT "timers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tods" (
    "id" SERIAL NOT NULL,
    "timer_id" INTEGER NOT NULL,
    "user_id" TEXT,
    "username" TEXT,
    "display_name" TEXT,
    "tod" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aliases" (
    "id" SERIAL NOT NULL,
    "timer_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_linked_timer_id_fkey" FOREIGN KEY ("linked_timer_id") REFERENCES "timers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_clear_parent_timer_id_fkey" FOREIGN KEY ("clear_parent_timer_id") REFERENCES "timers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tods" ADD CONSTRAINT "tods_timer_id_fkey" FOREIGN KEY ("timer_id") REFERENCES "timers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_timer_id_fkey" FOREIGN KEY ("timer_id") REFERENCES "timers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
