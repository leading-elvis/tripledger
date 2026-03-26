-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('TWD', 'USD', 'JPY', 'EUR', 'KRW', 'CNY', 'HKD', 'GBP', 'THB', 'VND', 'SGD', 'MYR', 'PHP', 'IDR', 'AUD');

-- AlterTable: Add defaultCurrency to trips
ALTER TABLE "trips" ADD COLUMN "default_currency" "Currency" NOT NULL DEFAULT 'TWD';

-- AlterTable: Add currency fields to bills
ALTER TABLE "bills" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'TWD';
ALTER TABLE "bills" ADD COLUMN "exchange_rate" DECIMAL(18,8);
ALTER TABLE "bills" ADD COLUMN "base_amount" DECIMAL(12,2);

-- CreateTable: ExchangeRate cache
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" "Currency" NOT NULL,
    "target_currency" "Currency" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_base_currency_target_currency_key" ON "exchange_rates"("base_currency", "target_currency");

-- CreateIndex
CREATE INDEX "exchange_rates_base_currency_idx" ON "exchange_rates"("base_currency");

-- CreateIndex
CREATE INDEX "exchange_rates_fetched_at_idx" ON "exchange_rates"("fetched_at");
