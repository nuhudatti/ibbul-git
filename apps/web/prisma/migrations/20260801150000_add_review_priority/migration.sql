-- Fix the live review schema drift by adding the missing Review.priority column.
ALTER TABLE "Review"
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
