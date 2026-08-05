-- AlterTable: add workspace-shell persistence so a CHANGES_REQUESTED resume can reopen the same IDE session context.
ALTER TABLE "ProjectSnapshot"
  ADD COLUMN "folders" JSONB,
  ADD COLUMN "activeFilePath" TEXT,
  ADD COLUMN "openTabs" JSONB,
  ADD COLUMN "explorerState" JSONB,
  ADD COLUMN "previewState" JSONB,
  ADD COLUMN "workspaceState" JSONB,
  ADD COLUMN "metadata" JSONB;
