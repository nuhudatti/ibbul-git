export type UserRole = "STUDENT" | "LECTURER" | "ADMIN";

export interface User {
  id: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  institutionId: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  ownerId: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  maxScore: number;
}

export interface GradeBreakdown {
  correctness: number;
  structure: number;
  bestPractices: number;
  uiQuality: number;
  efficiency: number;
}

export interface GradeResult {
  score: number;
  maxScore: number;
  breakdown: GradeBreakdown;
  feedback: string;
  suggestions: string[];
}

export interface DeploymentResult {
  id: string;
  status: "PENDING" | "BUILDING" | "SUCCESS" | "FAILED";
  url?: string;
  buildLogs?: string[];
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface LoginCredentials {
  matricNumber: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
