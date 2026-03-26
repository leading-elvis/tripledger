-- CreateTable
CREATE TABLE "virtual_members" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "merged_to" TEXT,
    "merged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique constraint: same trip cannot have duplicate virtual member names)
CREATE UNIQUE INDEX "virtual_members_trip_id_name_key" ON "virtual_members"("trip_id", "name");

-- AddColumn: bills.virtual_payer_id
ALTER TABLE "bills" ADD COLUMN "virtual_payer_id" TEXT;

-- AddColumn: bill_shares.virtual_member_id
ALTER TABLE "bill_shares" ADD COLUMN "virtual_member_id" TEXT;

-- AddColumn: bill_item_shares.virtual_member_id
ALTER TABLE "bill_item_shares" ADD COLUMN "virtual_member_id" TEXT;

-- AddColumn: settlements.virtual_payer_id
ALTER TABLE "settlements" ADD COLUMN "virtual_payer_id" TEXT;

-- AddColumn: settlements.virtual_receiver_id
ALTER TABLE "settlements" ADD COLUMN "virtual_receiver_id" TEXT;

-- DropIndex: Remove unique constraints that conflict with virtual members
-- (virtual members have null user_id, so uniqueness needs to be handled at app level)
DROP INDEX IF EXISTS "bill_shares_bill_id_user_id_key";
DROP INDEX IF EXISTS "bill_item_shares_bill_item_id_user_id_key";

-- CreateIndex: indexes for new FK columns
CREATE INDEX "bill_shares_virtual_member_id_idx" ON "bill_shares"("virtual_member_id");
CREATE INDEX "bill_item_shares_virtual_member_id_idx" ON "bill_item_shares"("virtual_member_id");

-- AddForeignKey: virtual_members -> trips
ALTER TABLE "virtual_members" ADD CONSTRAINT "virtual_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: virtual_members -> users (creator)
ALTER TABLE "virtual_members" ADD CONSTRAINT "virtual_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: virtual_members -> users (merged_to)
ALTER TABLE "virtual_members" ADD CONSTRAINT "virtual_members_merged_to_fkey" FOREIGN KEY ("merged_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: bills -> virtual_members (virtual payer)
ALTER TABLE "bills" ADD CONSTRAINT "bills_virtual_payer_id_fkey" FOREIGN KEY ("virtual_payer_id") REFERENCES "virtual_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: bill_shares -> virtual_members
ALTER TABLE "bill_shares" ADD CONSTRAINT "bill_shares_virtual_member_id_fkey" FOREIGN KEY ("virtual_member_id") REFERENCES "virtual_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: bill_item_shares -> virtual_members
ALTER TABLE "bill_item_shares" ADD CONSTRAINT "bill_item_shares_virtual_member_id_fkey" FOREIGN KEY ("virtual_member_id") REFERENCES "virtual_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: settlements -> virtual_members (virtual payer)
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_virtual_payer_id_fkey" FOREIGN KEY ("virtual_payer_id") REFERENCES "virtual_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: settlements -> virtual_members (virtual receiver)
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_virtual_receiver_id_fkey" FOREIGN KEY ("virtual_receiver_id") REFERENCES "virtual_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
