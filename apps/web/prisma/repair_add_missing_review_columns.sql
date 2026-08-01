-- Idempotent repair script for missing Review-related columns and enum values
-- Run this against the production database (e.g. with psql) after taking a backup.

BEGIN;

-- Ensure enum value exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'reviewworkflowstatus' AND e.enumlabel = 'UNDER_REVIEW'
    ) THEN
        ALTER TYPE "ReviewWorkflowStatus" ADD VALUE 'UNDER_REVIEW';
    END IF;
END $$;

-- Review table additions
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "reviewStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "publishNote" TEXT;

-- ReviewComment additions
ALTER TABLE "ReviewComment"
  ADD COLUMN IF NOT EXISTS "feedbackType" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS "filePath" TEXT,
  ADD COLUMN IF NOT EXISTS "lineNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- Revision additions
ALTER TABLE "Revision"
  ADD COLUMN IF NOT EXISTS "revisionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "sourceRevisionId" TEXT,
  ADD COLUMN IF NOT EXISTS "deploymentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submitterMatric" TEXT,
  ADD COLUMN IF NOT EXISTS "submitterRole" TEXT;

-- RevisionFile additions
ALTER TABLE "RevisionFile"
  ADD COLUMN IF NOT EXISTS "fileHash" TEXT;

-- Create ReviewRating table if missing
CREATE TABLE IF NOT EXISTS "ReviewRating" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "codeQuality" INTEGER,
    "uiUx" INTEGER,
    "responsiveness" INTEGER,
    "accessibility" INTEGER,
    "performance" INTEGER,
    "bestPractices" INTEGER,
    "overall" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReviewRating_pkey" PRIMARY KEY ("id")
);

-- Ensure unique index exists for ReviewRating.reviewId
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewRating_reviewId_key" ON "ReviewRating"("reviewId");

-- Add FK constraint if not exists (uses pg_constraint check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ReviewRating_reviewId_fkey'
    ) THEN
        ALTER TABLE "ReviewRating"
        ADD CONSTRAINT "ReviewRating_reviewId_fkey"
        FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;

-- End of repair script
