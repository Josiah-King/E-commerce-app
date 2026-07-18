/*
  Warnings:

  - A unique constraint covering the columns `[checkoutRequestId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutRequestId_key" ON "Order"("checkoutRequestId");
