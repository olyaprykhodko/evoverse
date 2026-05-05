/*
  Warnings:

  - You are about to drop the `GameSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RouletteBet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RouletteBet" DROP CONSTRAINT "RouletteBet_gameId_fkey";

-- DropTable
DROP TABLE "GameSession";

-- DropTable
DROP TABLE "RouletteBet";

-- CreateTable
CREATE TABLE "game_session" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "server_seed" TEXT NOT NULL,
    "server_hash" TEXT NOT NULL,
    "client_seed" TEXT,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roulette_bet" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "game_id" TEXT NOT NULL,
    "bet_type" TEXT NOT NULL,
    "target_number" INTEGER,
    "bet_amount" INTEGER NOT NULL,
    "winning_number" INTEGER NOT NULL,
    "payout_amount" INTEGER NOT NULL,
    "is_win" BOOLEAN NOT NULL,
    "nonce" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roulette_bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_session_user_id_idx" ON "game_session"("user_id");

-- CreateIndex
CREATE INDEX "game_session_is_open_idx" ON "game_session"("is_open");

-- CreateIndex
CREATE INDEX "roulette_bet_user_id_idx" ON "roulette_bet"("user_id");

-- CreateIndex
CREATE INDEX "roulette_bet_game_id_idx" ON "roulette_bet"("game_id");

-- CreateIndex
CREATE INDEX "roulette_bet_is_win_idx" ON "roulette_bet"("is_win");

-- AddForeignKey
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roulette_bet" ADD CONSTRAINT "roulette_bet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roulette_bet" ADD CONSTRAINT "roulette_bet_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
