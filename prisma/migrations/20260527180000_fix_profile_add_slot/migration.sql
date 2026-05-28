-- Fix profile table drift (balance was dropped directly in DB; document it here)
ALTER TABLE "profile" DROP COLUMN IF EXISTS "balance";
ALTER TABLE "profile" ALTER COLUMN "rating" SET DEFAULT 0;

-- Add slot coin transaction types
ALTER TYPE "coin_transaction_type" ADD VALUE IF NOT EXISTS 'SLOT_BET';
ALTER TYPE "coin_transaction_type" ADD VALUE IF NOT EXISTS 'SLOT_WIN';

-- Create slot_spin table
CREATE TABLE IF NOT EXISTS "slot_spin" (
    "id"           TEXT NOT NULL,
    "user_id"      INTEGER NOT NULL,
    "server_seed"  TEXT NOT NULL,
    "server_hash"  TEXT NOT NULL,
    "client_seed"  TEXT NOT NULL,
    "nonce"        INTEGER NOT NULL,
    "stop1"        INTEGER NOT NULL,
    "stop2"        INTEGER NOT NULL,
    "stop3"        INTEGER NOT NULL,
    "sym1"         TEXT NOT NULL,
    "sym2"         TEXT NOT NULL,
    "sym3"         TEXT NOT NULL,
    "bet_amount"   INTEGER NOT NULL,
    "payout_amount" INTEGER NOT NULL,
    "is_win"       BOOLEAN NOT NULL,
    "win_type"     TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slot_spin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "slot_spin_user_id_idx" ON "slot_spin"("user_id");
CREATE INDEX IF NOT EXISTS "slot_spin_is_win_idx"  ON "slot_spin"("is_win");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'slot_spin_user_id_fkey'
  ) THEN
    ALTER TABLE "slot_spin"
      ADD CONSTRAINT "slot_spin_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "user"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
