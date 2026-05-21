-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "serverHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouletteBet" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "betType" TEXT NOT NULL,
    "betAmount" INTEGER NOT NULL,
    "winningNumber" INTEGER NOT NULL,
    "payoutAmount" INTEGER NOT NULL,
    "isWin" BOOLEAN NOT NULL,
    "nonce" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouletteBet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RouletteBet" ADD CONSTRAINT "RouletteBet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
