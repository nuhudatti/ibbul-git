-- AlterTable
ALTER TABLE "Review"
ADD COLUMN "reviewStartedAt" TIMESTAMP(3),
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "publishNote" TEXT;

-- AlterTable
ALTER TABLE "ReviewComment"
ADD COLUMN "feedbackType" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "filePath" TEXT,
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN',
ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Revision"
ADD COLUMN "revisionNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "sourceRevisionId" TEXT,
ADD COLUMN "deploymentUrl" TEXT,
ADD COLUMN "submitterMatric" TEXT,
ADD COLUMN "submitterRole" TEXT;
