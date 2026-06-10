-- Reconcile migration-trail drift against the schema folder (found by replaying
-- all migrations on a virgin Postgres and diffing vs prisma/schema).
-- Three groups, all safe on existing data:
--   1. Money columns: double precision -> DECIMAL(65,30). The schema declares
--      Prisma `Decimal`; widening conversion, lossless.
--   2. Drop DB-side now() defaults on updatedAt columns the client manages
--      via @updatedAt (CouncilDiscussion, ProtocolClause, RolePermission).
--   3. Add the four foreign keys the schema declares but migrations never
--      created (User.reportsToId self-relation, council share/reply relations).
--      Seed-derived data satisfies these; an orphaned row would fail loudly
--      here rather than silently corrupting later.

-- AlterTable
ALTER TABLE "CouncilDiscussion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ImportRow" ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "InventoryMovement" ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "JournalLine" ALTER COLUMN "debit" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "credit" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "ProtocolClause" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PurchaseOrderLine" ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "RolePermission" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalesOrderLine" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilDiscussion" ADD CONSTRAINT "CouncilDiscussion_sharedByUserId_fkey" FOREIGN KEY ("sharedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilReply" ADD CONSTRAINT "CouncilReply_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "CouncilDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilReply" ADD CONSTRAINT "CouncilReply_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
