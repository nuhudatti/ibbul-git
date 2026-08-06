-- Add the workspace snapshot fields required by the lecturer submission pipeline
ALTER TABLE "ProjectSnapshot"
  ADD COLUMN IF NOT EXISTS "folders" JSONB,
  ADD COLUMN IF NOT EXISTS "activeFilePath" TEXT,
  ADD COLUMN IF NOT EXISTS "openTabs" JSONB,
  ADD COLUMN IF NOT EXISTS "explorerState" JSONB,
  ADD COLUMN IF NOT EXISTS "previewState" JSONB,
  ADD COLUMN IF NOT EXISTS "workspaceState" JSONB,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
