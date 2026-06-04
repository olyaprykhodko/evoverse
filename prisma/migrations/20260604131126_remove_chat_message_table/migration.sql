/*
  Warnings:

  - You are about to drop the `chat_message` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_user_id_fkey";

-- DropTable
DROP TABLE "chat_message";
