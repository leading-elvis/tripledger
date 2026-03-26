-- Sprint 1: 付費框架 MVP
-- 新增內購系統相關資料表和欄位

-- 新增購買平台和產品類型枚舉
CREATE TYPE "PurchasePlatform" AS ENUM ('IOS', 'ANDROID');
CREATE TYPE "ProductType" AS ENUM ('CONSUMABLE', 'NON_CONSUMABLE');

-- 新增 User 內購相關欄位
ALTER TABLE "users" ADD COLUMN "is_ad_free" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "ad_free_since" TIMESTAMP(3);

-- 新增 Trip 內購相關欄位
ALTER TABLE "trips" ADD COLUMN "premium_expires_at" TIMESTAMP(3);

-- 建立 Purchase 資料表
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_type" "ProductType" NOT NULL,
    "trip_id" TEXT,
    "days_granted" INTEGER,
    "platform" "PurchasePlatform" NOT NULL,
    "receipt_data" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- 建立索引
CREATE UNIQUE INDEX "purchases_transaction_id_key" ON "purchases"("transaction_id");
CREATE INDEX "purchases_user_id_idx" ON "purchases"("user_id");
CREATE INDEX "purchases_trip_id_idx" ON "purchases"("trip_id");

-- 建立外鍵關聯
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
