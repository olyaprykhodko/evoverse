-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "email" TEXT,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "ban_end_at" TIMESTAMP(3),
    "role" INTEGER NOT NULL DEFAULT 1,
    "last_login_ip" TEXT,
    "last_login_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "avatar" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "address" (
    "user_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "address2" TEXT,
    "country" TEXT,
    "postal_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_created_at_idx" ON "user"("created_at");

-- CreateIndex
CREATE INDEX "user_last_login_ip_idx" ON "user"("last_login_ip");

-- CreateIndex
CREATE INDEX "profile_level_idx" ON "profile"("level");

-- CreateIndex
CREATE INDEX "profile_rating_idx" ON "profile"("rating");

-- CreateIndex
CREATE INDEX "address_country_idx" ON "address"("country");

-- CreateIndex
CREATE INDEX "address_city_idx" ON "address"("city");

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
