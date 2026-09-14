-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "normalizedSourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "Analysis_normalizedSourceUrl_createdAt_idx" ON "Analysis"("normalizedSourceUrl", "createdAt");
