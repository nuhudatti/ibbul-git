-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'LECTURER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'pending', 'suspended');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "matric" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT 'Verified builder · Live deployable work',
    "email" TEXT NOT NULL,
    "avatarInitials" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "accountRole" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'pending',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "notifyAssignments" BOOLEAN NOT NULL DEFAULT true,
    "notifyGrades" BOOLEAN NOT NULL DEFAULT true,
    "notifyPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "publicProfile" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSnapshot" (
    "id" TEXT NOT NULL,
    "studentMatric" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "deployUrl" TEXT,
    "score" INTEGER,

    CONSTRAINT "ProjectSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioArtifact" (
    "id" TEXT NOT NULL,
    "studentMatric" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "score" INTEGER,
    "maxScore" INTEGER NOT NULL,
    "deployUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "lecturerId" TEXT,
    "lecturerName" TEXT,
    "lecturerNote" TEXT,
    "hash" TEXT NOT NULL,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "skills" TEXT[],
    "thumbnailGradient" TEXT,

    CONSTRAINT "PortfolioArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudinaryAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentMatric" TEXT,

    CONSTRAINT "CloudinaryAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_matric_key" ON "StudentProfile"("matric");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_email_key" ON "StudentProfile"("email");

-- CreateIndex
CREATE INDEX "StudentProfile_accountRole_idx" ON "StudentProfile"("accountRole");

-- CreateIndex
CREATE INDEX "StudentProfile_status_idx" ON "StudentProfile"("status");

-- CreateIndex
CREATE INDEX "StudentProfile_email_idx" ON "StudentProfile"("email");

-- CreateIndex
CREATE INDEX "ProjectSnapshot_studentMatric_idx" ON "ProjectSnapshot"("studentMatric");

-- CreateIndex
CREATE INDEX "ProjectSnapshot_assignmentId_idx" ON "ProjectSnapshot"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioArtifact_hash_key" ON "PortfolioArtifact"("hash");

-- CreateIndex
CREATE INDEX "PortfolioArtifact_studentMatric_idx" ON "PortfolioArtifact"("studentMatric");

-- CreateIndex
CREATE INDEX "PortfolioArtifact_status_idx" ON "PortfolioArtifact"("status");

-- CreateIndex
CREATE INDEX "PortfolioArtifact_verified_idx" ON "PortfolioArtifact"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "CloudinaryAsset_publicId_key" ON "CloudinaryAsset"("publicId");

-- CreateIndex
CREATE INDEX "CloudinaryAsset_studentMatric_idx" ON "CloudinaryAsset"("studentMatric");

-- AddForeignKey
ALTER TABLE "ProjectSnapshot" ADD CONSTRAINT "ProjectSnapshot_studentMatric_fkey" FOREIGN KEY ("studentMatric") REFERENCES "StudentProfile"("matric") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioArtifact" ADD CONSTRAINT "PortfolioArtifact_studentMatric_fkey" FOREIGN KEY ("studentMatric") REFERENCES "StudentProfile"("matric") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudinaryAsset" ADD CONSTRAINT "CloudinaryAsset_studentMatric_fkey" FOREIGN KEY ("studentMatric") REFERENCES "StudentProfile"("matric") ON DELETE SET NULL ON UPDATE CASCADE;
