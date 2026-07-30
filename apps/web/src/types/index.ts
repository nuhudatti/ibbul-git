import type { Role } from "@prisma/client";

export type UserRole = Role;

export interface User {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  institutionId: string;
  avatarUrl?: string;
  program?: string;
  headline?: string;
  mustChangePassword?: boolean;
}

export type StudentAccountStatus = "active" | "pending" | "suspended";

export interface AdminStudentRecord {
  matric: string;
  firstName: string;
  lastName: string;
  displayName: string;
  program: string;
  email: string;
  avatar: string;
  avatarUrl?: string;
  status: StudentAccountStatus;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  hasCustomPassword: boolean;
}

export interface AdminStats {
  totalStudents: number;
  active: number;
  pending: number;
  suspended: number;
  mustChangePassword: number;
  registeredToday: number;
  lastProvisionedAt?: string;
}

export interface StudentSettings {
  matric: string;
  firstName: string;
  lastName: string;
  displayName: string;
  program: string;
  headline: string;
  email: string;
  avatar: string;
  avatarUrl?: string;
  notifyAssignments: boolean;
  notifyGrades: boolean;
  notifyPortfolio: boolean;
  publicProfile: boolean;
  updatedAt?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface DeploymentState {
  status: "idle" | "building" | "optimizing" | "deploying" | "success" | "failed";
  url?: string;
  logs: string[];
  progress: number;
}

export interface GradeBreakdown {
  correctness: number;
  structure: number;
  bestPractices: number;
  uiQuality: number;
  efficiency: number;
}

export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type EnrollmentStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";
export type StudentLiveStatus = "typing" | "idle" | "submitted" | "offline";
export type RiskLevel = "safe" | "watch" | "critical";
export type EngagementHeat = "high" | "medium" | "low";

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  deadline?: string;
  status: AssignmentStatus;
  maxScore: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  engagement?: EngagementHeat;
  enrolled: number;
  submitted: number;
  starterFiles?: ProjectFile[];
}

export interface StudentEnrollment {
  id?: string;
  assignmentId: string;
  studentMatric: string;
  status: EnrollmentStatus;
  startedAt?: string;
  submittedAt?: string;
  score?: number;
  deployUrl?: string;
}

export interface ProjectSnapshot {
  assignmentId: string;
  studentMatric: string;
  projectName: string;
  files: ProjectFile[];
  savedAt: string;
  submittedAt?: string;
  deployUrl?: string;
  score?: number;
}

export interface ActivityEvent {
  id: string;
  type: "start" | "deploy" | "submit" | "ai_help" | "error" | "grade" | "idle";
  student: string;
  matric: string;
  message: string;
  timestamp: string;
}

export interface AiInsight {
  id: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  detail: string;
  action?: string;
}

export interface StudentMatrixEntry {
  id: string;
  name: string;
  matric: string;
  avatar: string;
  status: EnrollmentStatus;
  liveStatus: StudentLiveStatus;
  risk: RiskLevel;
  predictionScore: number;
  score: number | null;
  lastActive: string;
  assignmentProgress: number;
  activityTimeline: string[];
}

/** Verified Proof-of-Work Portfolio Engine (VPE) */
export type PortfolioArtifactStatus =
  | "PENDING"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export interface PortfolioArtifact {
  id: string;
  studentMatric: string;
  studentName: string;
  assignmentId: string;
  courseId: string;
  courseName: string;
  title: string;
  description?: string;
  score: number | null;
  maxScore: number;
  deployUrl?: string;
  timestamp: string;
  submittedAt: string;
  verified: boolean;
  verifiedAt?: string;
  lecturerId?: string;
  lecturerName?: string;
  lecturerNote?: string;
  hash: string;
  status: PortfolioArtifactStatus;
  skills: string[];
  thumbnailGradient?: string;
}

export interface PortfolioFeedEvent {
  id: string;
  type: "deploy" | "submit" | "verify" | "portfolio" | "grade";
  studentMatric: string;
  studentName: string;
  title: string;
  message: string;
  timestamp: string;
  artifactId?: string;
  score?: number;
}

export interface StudentPortfolioProfile {
  matric: string;
  displayName: string;
  avatar: string;
  avatarUrl?: string;
  institution: string;
  program: string;
  joinedAt: string;
  headline: string;
  verifiedCount: number;
  totalArtifacts: number;
  avgScore: number | null;
  liveDeploys: number;
  updatedAt?: string;
}
