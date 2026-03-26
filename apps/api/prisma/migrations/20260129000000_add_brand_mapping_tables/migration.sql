-- CreateTable
CREATE TABLE "company_brand_mappings" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "tax_id" TEXT,
    "brand_name" TEXT NOT NULL,
    "category" "BillCategory",
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_brand_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_brand_mappings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "custom_brand_name" TEXT NOT NULL,
    "use_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_brand_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_brand_mappings_company_name_key" ON "company_brand_mappings"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "company_brand_mappings_tax_id_key" ON "company_brand_mappings"("tax_id");

-- CreateIndex
CREATE INDEX "company_brand_mappings_company_name_idx" ON "company_brand_mappings"("company_name");

-- CreateIndex
CREATE INDEX "company_brand_mappings_tax_id_idx" ON "company_brand_mappings"("tax_id");

-- CreateIndex
CREATE INDEX "company_brand_mappings_brand_name_idx" ON "company_brand_mappings"("brand_name");

-- CreateIndex
CREATE INDEX "user_brand_mappings_user_id_idx" ON "user_brand_mappings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_brand_mappings_user_id_company_name_key" ON "user_brand_mappings"("user_id", "company_name");

-- AddForeignKey
ALTER TABLE "user_brand_mappings" ADD CONSTRAINT "user_brand_mappings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
