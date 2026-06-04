-- Extend slot from 3 reels to 5 reels with multi-line wins.
-- Replaces fixed stop1..3 / sym1..3 columns with array/JSON columns.

-- Drop legacy 3-reel columns
ALTER TABLE "slot_spin"
  DROP COLUMN "stop1",
  DROP COLUMN "stop2",
  DROP COLUMN "stop3",
  DROP COLUMN "sym1",
  DROP COLUMN "sym2",
  DROP COLUMN "sym3";

-- Add 5-reel columns. Temporary defaults backfill any existing rows, then
-- the defaults are dropped so the schema matches (no @default in Prisma model).
ALTER TABLE "slot_spin"
  ADD COLUMN "stops" INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN "grid"  JSONB     NOT NULL DEFAULT '[]',
  ADD COLUMN "wins"  JSONB     NOT NULL DEFAULT '[]';

ALTER TABLE "slot_spin"
  ALTER COLUMN "stops" DROP DEFAULT,
  ALTER COLUMN "grid"  DROP DEFAULT,
  ALTER COLUMN "wins"  DROP DEFAULT;
