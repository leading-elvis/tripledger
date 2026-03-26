-- Add Apple Sign In support
-- Add appleId column to users table
ALTER TABLE "users" ADD COLUMN "apple_id" TEXT;

-- Create unique index for appleId
CREATE UNIQUE INDEX "users_apple_id_key" ON "users"("apple_id");

-- Support account deletion with data anonymization
-- Make Bill.payerId nullable and change onDelete to SET NULL
ALTER TABLE "bills" ALTER COLUMN "payer_id" DROP NOT NULL;

-- Make BillShare.userId nullable and change onDelete to SET NULL
ALTER TABLE "bill_shares" ALTER COLUMN "user_id" DROP NOT NULL;

-- Make BillItemShare.userId nullable and change onDelete to SET NULL
ALTER TABLE "bill_item_shares" ALTER COLUMN "user_id" DROP NOT NULL;

-- Make Settlement.payerId and receiverId nullable and change onDelete to SET NULL
ALTER TABLE "settlements" ALTER COLUMN "payer_id" DROP NOT NULL;
ALTER TABLE "settlements" ALTER COLUMN "receiver_id" DROP NOT NULL;

-- Drop existing foreign key constraints and recreate with SET NULL
-- Bills
ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_payer_id_fkey";
ALTER TABLE "bills" ADD CONSTRAINT "bills_payer_id_fkey"
    FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BillShares
ALTER TABLE "bill_shares" DROP CONSTRAINT IF EXISTS "bill_shares_user_id_fkey";
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- BillItemShares
ALTER TABLE "bill_item_shares" DROP CONSTRAINT IF EXISTS "bill_item_shares_user_id_fkey";
ALTER TABLE "bill_item_shares" ADD CONSTRAINT "bill_item_shares_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Settlements (payer)
ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_payer_id_fkey";
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payer_id_fkey"
    FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Settlements (receiver)
ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_receiver_id_fkey";
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_receiver_id_fkey"
    FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
