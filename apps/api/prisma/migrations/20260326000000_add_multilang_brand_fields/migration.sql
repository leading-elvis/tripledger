-- AlterTable: 多語言品牌名稱
ALTER TABLE "company_brand_mappings" ADD COLUMN "name_ja" TEXT;
ALTER TABLE "company_brand_mappings" ADD COLUMN "name_ko" TEXT;

-- CreateTable: OCR 掃描配額
CREATE TABLE "ocr_scan_quotas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_scan_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ocr_scan_quotas_user_id_key" ON "ocr_scan_quotas"("user_id");

-- AddForeignKey
ALTER TABLE "ocr_scan_quotas" ADD CONSTRAINT "ocr_scan_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
