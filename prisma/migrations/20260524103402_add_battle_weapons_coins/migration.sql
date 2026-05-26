-- CreateEnum
CREATE TYPE "coin_transaction_type" AS ENUM ('EARNED_BATTLE', 'SPENT_WEAPON', 'CONVERTED_TO_CASH');

-- CreateEnum
CREATE TYPE "weapon_rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "battle_status" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- AlterTable
ALTER TABLE "wallet" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "coin_transaction" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "coin_transaction_type" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "min_damage" INTEGER NOT NULL,
    "max_damage" INTEGER NOT NULL,
    "rarity" "weapon_rarity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_weapon" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "weapon_id" INTEGER NOT NULL,
    "bought_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_session" (
    "id" TEXT NOT NULL,
    "player1_id" INTEGER NOT NULL,
    "player2_id" INTEGER NOT NULL,
    "weapon1_id" INTEGER NOT NULL,
    "weapon2_id" INTEGER NOT NULL,
    "status" "battle_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "winner_id" INTEGER,
    "rounds" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "battle_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_stats" (
    "user_id" INTEGER NOT NULL,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_losses" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "max_streak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "battle_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "coin_transaction_wallet_id_idx" ON "coin_transaction"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "weapon_name_key" ON "weapon"("name");

-- CreateIndex
CREATE INDEX "user_weapon_user_id_idx" ON "user_weapon"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_weapon_user_id_weapon_id_key" ON "user_weapon"("user_id", "weapon_id");

-- CreateIndex
CREATE INDEX "battle_session_player1_id_idx" ON "battle_session"("player1_id");

-- CreateIndex
CREATE INDEX "battle_session_player2_id_idx" ON "battle_session"("player2_id");

-- CreateIndex
CREATE INDEX "battle_session_status_idx" ON "battle_session"("status");

-- AddForeignKey
ALTER TABLE "coin_transaction" ADD CONSTRAINT "coin_transaction_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weapon" ADD CONSTRAINT "user_weapon_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weapon" ADD CONSTRAINT "user_weapon_weapon_id_fkey" FOREIGN KEY ("weapon_id") REFERENCES "weapon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_session" ADD CONSTRAINT "battle_session_player1_id_fkey" FOREIGN KEY ("player1_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_session" ADD CONSTRAINT "battle_session_player2_id_fkey" FOREIGN KEY ("player2_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_session" ADD CONSTRAINT "battle_session_weapon1_id_fkey" FOREIGN KEY ("weapon1_id") REFERENCES "weapon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_session" ADD CONSTRAINT "battle_session_weapon2_id_fkey" FOREIGN KEY ("weapon2_id") REFERENCES "weapon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_stats" ADD CONSTRAINT "battle_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
