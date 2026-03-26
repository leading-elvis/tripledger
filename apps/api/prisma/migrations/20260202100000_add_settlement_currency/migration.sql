-- AlterTable: 新增結算幣種欄位
-- 預設值為 TWD (新台幣)，與現有資料相容
ALTER TABLE "settlements" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'TWD';
