-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('OPENING_STOCK', 'PURCHASE', 'SALE', 'SALES_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'EXCEL_IMPORT', 'ORDER_CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('ONLINE', 'WHATSAPP', 'STORE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'UPI', 'CARD', 'CASH', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "StockState" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "GatewayPaymentStatus" AS ENUM ('CREATED', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "StitchingStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StitchingImageKind" AS ENUM ('REFERENCE', 'MATERIAL', 'INSPIRATION');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FLAT');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "resetTokenHash" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategory" TEXT,
    "shortDesc" TEXT,
    "description" TEXT,
    "fabric" TEXT,
    "careNotes" TEXT,
    "supplierId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT 'Free Size',
    "color" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "lowStockLevel" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierContact" TEXT,
    "invoiceNumber" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "SupplierPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "additionalCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByName" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "size" TEXT NOT NULL DEFAULT 'Free Size',
    "color" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2),
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "reason" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_items" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "purchaseItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "accessKey" TEXT NOT NULL,
    "channel" "OrderChannel" NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "deliveryNotes" TEXT,
    "mrpTotal" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "extraDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "stockState" "StockState" NOT NULL DEFAULT 'RESERVED',
    "reservedUntil" TIMESTAMP(3),
    "cashierName" TEXT,
    "courier" TEXT,
    "trackingNumber" TEXT,
    "adminNotes" TEXT,
    "needsAttention" TEXT,
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "method" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "GatewayPaymentStatus" NOT NULL DEFAULT 'CREATED',
    "errorReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_returns" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT,
    "refundMethod" "PaymentMethod" NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_items" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "restocked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stitching_requests" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "material" TEXT,
    "size" TEXT,
    "bust" TEXT,
    "waist" TEXT,
    "hip" TEXT,
    "shoulder" TEXT,
    "sleeveLength" TEXT,
    "dressLength" TEXT,
    "otherMeasurements" TEXT,
    "stitchingStyle" TEXT,
    "neckDesign" TEXT,
    "sleeveDesign" TEXT,
    "instructions" TEXT,
    "status" "StitchingStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stitching_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stitching_images" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" "StitchingImageKind" NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stitching_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "text" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "minOrder" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_sessions_userId_idx" ON "admin_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_status_idx" ON "products"("categoryId", "status");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "stock_movements_variantId_createdAt_idx" ON "stock_movements"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_number_key" ON "purchases"("number");

-- CreateIndex
CREATE INDEX "purchases_purchaseDate_idx" ON "purchases"("purchaseDate");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_number_key" ON "purchase_returns"("number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_phone_idx" ON "orders"("phone");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_status_logs_orderId_idx" ON "order_status_logs"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_providerOrderId_key" ON "payments"("providerOrderId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_returns_number_key" ON "sales_returns"("number");

-- CreateIndex
CREATE INDEX "sales_returns_createdAt_idx" ON "sales_returns"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stitching_requests_number_key" ON "stitching_requests"("number");

-- CreateIndex
CREATE INDEX "stitching_requests_status_createdAt_idx" ON "stitching_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "sales_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stitching_images" ADD CONSTRAINT "stitching_images_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "stitching_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

