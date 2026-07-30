BEGIN;

-- Create enums
DO $$ BEGIN
    CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Assignment table
CREATE TABLE IF NOT EXISTS "Assignment" (
  "id" text PRIMARY KEY,
  "title" text NOT NULL,
  "description" text,
  "instructions" text,
  "deadline" timestamptz,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
  "maxScore" integer NOT NULL,
  "difficulty" text NOT NULL,
  "engagement" text,
  "enrolled" integer NOT NULL DEFAULT 0,
  "submitted" integer NOT NULL DEFAULT 0,
  "starterFiles" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Assignment_status_idx" ON "Assignment" ("status");

-- Create Enrollment table
CREATE TABLE IF NOT EXISTS "Enrollment" (
  "id" text PRIMARY KEY,
  "assignmentId" text NOT NULL REFERENCES "Assignment" ("id") ON DELETE CASCADE,
  "studentMatric" text NOT NULL REFERENCES "StudentProfile" ("matric") ON DELETE CASCADE,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" timestamptz,
  "submittedAt" timestamptz,
  "score" integer,
  "deployUrl" text
);

CREATE INDEX IF NOT EXISTS "Enrollment_assignmentId_idx" ON "Enrollment" ("assignmentId");
CREATE INDEX IF NOT EXISTS "Enrollment_studentMatric_idx" ON "Enrollment" ("studentMatric");

COMMIT;
