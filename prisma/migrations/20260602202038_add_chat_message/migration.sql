-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "room" TEXT NOT NULL DEFAULT 'global',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_message_room_created_at_idx" ON "chat_message"("room", "created_at");

-- CreateIndex
CREATE INDEX "chat_message_user_id_idx" ON "chat_message"("user_id");

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
