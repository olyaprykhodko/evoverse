-- AlterTable
ALTER TABLE "user" ADD COLUMN     "discord_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_discord_id_key" ON "user"("discord_id");
