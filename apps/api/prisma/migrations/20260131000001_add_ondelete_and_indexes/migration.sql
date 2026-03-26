-- Add onDelete: Restrict to Bill.payer
ALTER TABLE "bills" DROP CONSTRAINT IF EXISTS "bills_payer_id_fkey";
ALTER TABLE "bills" ADD CONSTRAINT "bills_payer_id_fkey"
  FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add onDelete: Restrict to BillShare.user
ALTER TABLE "bill_shares" DROP CONSTRAINT IF EXISTS "bill_shares_user_id_fkey";
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add onDelete: Restrict to BillItemShare.user
ALTER TABLE "bill_item_shares" DROP CONSTRAINT IF EXISTS "bill_item_shares_user_id_fkey";
ALTER TABLE "bill_item_shares" ADD CONSTRAINT "bill_item_shares_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add onDelete: Restrict to Settlement.payer
ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_payer_id_fkey";
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_payer_id_fkey"
  FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add onDelete: Restrict to Settlement.receiver
ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_receiver_id_fkey";
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_receiver_id_fkey"
  FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "bills_trip_id_created_at_idx" ON "bills"("trip_id", "created_at");
CREATE INDEX IF NOT EXISTS "bills_payer_id_idx" ON "bills"("payer_id");
CREATE INDEX IF NOT EXISTS "bill_shares_user_id_idx" ON "bill_shares"("user_id");
CREATE INDEX IF NOT EXISTS "settlements_status_idx" ON "settlements"("status");
