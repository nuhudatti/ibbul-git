-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('BUILDING', 'DEPLOYED', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProjectDeployment" (
    "id" TEXT NOT NULL,
    "studentMatric" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "deployUrl" TEXT NOT NULL,
    "deployedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewerName" TEXT,
    "reviewNote" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'DEPLOYED',

    CONSTRAINT "ProjectDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDeployment_studentMatric_idx" ON "ProjectDeployment"("studentMatric");

-- CreateIndex
CREATE INDEX "ProjectDeployment_assignmentId_idx" ON "ProjectDeployment"("assignmentId");

-- CreateIndex
CREATE INDEX "ProjectDeployment_deployUrl_idx" ON "ProjectDeployment"("deployUrl");

-- CreateIndex
CREATE INDEX "ProjectDeployment_isLatest_idx" ON "ProjectDeployment"("isLatest");

-- AddForeignKey
ALTER TABLE "ProjectDeployment" ADD CONSTRAINT "ProjectDeployment_studentMatric_fkey" FOREIGN KEY ("studentMatric") REFERENCES "StudentProfile"("matric") ON DELETE CASCADE ON UPDATE CASCADE;
