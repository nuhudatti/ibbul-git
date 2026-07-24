import { normalizeMatric, parseMatricParts, isValidStudentMatric } from "@/lib/matric";
import { STUDENT_DIRECTORY } from "@/lib/student-directory";
import { generateTempPassword } from "@/lib/temp-password";
import type { AdminStats, AdminStudentRecord, StudentAccountStatus } from "@/types";
import {
  authenticateStudent,
  createStudentProfile,
  getAdminStats as getAdminStatsService,
  getProfileRecordByMatric,
  getResolvedProfileRecord,
  hashPassword,
  updateStudentProfileRecord,
  updateStudentStatusRecord,
  verifyPassword,
} from "@/lib/services/student-profile-service";

export type AccountRole = "STUDENT" | "LECTURER" | "ADMIN" | "SUPER_ADMIN";

export interface StudentProfileRecord {
  matric: string;
  firstName: string;
  lastName: string;
  program: string;
  headline: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string;
  passwordHash: string;
  accountRole: AccountRole;
  status: StudentAccountStatus;
  mustChangePassword: boolean;
  notifyAssignments: boolean;
  notifyGrades: boolean;
  notifyPortfolio: boolean;
  publicProfile: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface ResolvedStudentProfile {
  matric: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatar: string;
  avatarUrl?: string;
  program: string;
  headline: string;
  email: string;
  notifyAssignments: boolean;
  notifyGrades: boolean;
  notifyPortfolio: boolean;
  publicProfile: boolean;
}

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function resolveAvatarUrl(recordUrl?: string): string | undefined {
  if (recordUrl?.startsWith("data:")) return recordUrl;
  if (recordUrl?.startsWith("/uploads/")) return recordUrl.split("?")[0];
  if (recordUrl?.startsWith("http://") || recordUrl?.startsWith("https://")) return recordUrl;
  return undefined;
}

function toStudentProfileRecord(record: any): StudentProfileRecord {
  return {
    matric: normalizeMatric(record.matric),
    firstName: record.firstName,
    lastName: record.lastName,
    program: record.program,
    headline: record.headline,
    email: record.email,
    avatarInitials: record.avatarInitials,
    avatarUrl: record.avatarUrl ?? undefined,
    passwordHash: record.passwordHash,
    accountRole: record.accountRole,
    status: record.status,
    mustChangePassword: record.mustChangePassword,
    notifyAssignments: record.notifyAssignments,
    notifyGrades: record.notifyGrades,
    notifyPortfolio: record.notifyPortfolio,
    publicProfile: record.publicProfile,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastLoginAt: record.lastLoginAt?.toISOString(),
  };
}

function toAdminRecord(record: any): AdminStudentRecord {
  return {
    matric: normalizeMatric(record.matric),
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: `${record.firstName} ${record.lastName}`.trim(),
    program: record.program,
    email: record.email,
    avatar: record.avatarInitials,
    avatarUrl: record.avatarUrl ?? undefined,
    status: record.status,
    mustChangePassword: record.mustChangePassword,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    lastLoginAt: record.lastLoginAt?.toISOString(),
    hasCustomPassword: !record.mustChangePassword,
  };
}

export async function getProfileRecord(matric: string): Promise<StudentProfileRecord | null> {
  const row = await getProfileRecordByMatric(matric);
  if (!row) return null;
  return toStudentProfileRecord(row);
}

export async function getAdminStats(): Promise<AdminStats> {
  return getAdminStatsService();
}

export async function createStudentAccount(input: {
  matric: string;
  firstName: string;
  lastName: string;
  program: string;
  email?: string;
  tempPassword?: string;
}): Promise<{ record: AdminStudentRecord; tempPassword: string } | { error: string }> {
  const matric = normalizeMatric(input.matric);
  if (!isValidStudentMatric(matric)) {
    return {
      error: `Invalid matric format. Use U{year}/{faculty}/{department}/{number} (e.g. U22/FNS/CSC/1105)`,
    };
  }

  if (!parseMatricParts(matric)) {
    return { error: "Could not parse matric components" };
  }

  const tempPassword = input.tempPassword ?? generateTempPassword();

  try {
    const record = await createStudentProfile({
      matric,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      program: input.program.trim() || "B.Sc Computer Science",
      email: input.email?.trim(),
      passwordHash: hashPassword(tempPassword),
      accountRole: "STUDENT",
      status: "pending",
      mustChangePassword: true,
    });

    return { record, tempPassword };
  } catch (error: any) {
    const duplicate = error?.code === "P2002" || /unique constraint/i.test(error?.message ?? "");
    if (duplicate) {
      return { error: `Student ${matric} already exists` };
    }
    throw error;
  }
}

export async function bulkCreateStudents(
  rows: {
    matric: string;
    firstName: string;
    lastName: string;
    program?: string;
    email?: string;
  }[]
): Promise<{
  created: { record: AdminStudentRecord; tempPassword: string }[];
  errors: { row: number; matric: string; error: string }[];
}> {
  const created: { record: AdminStudentRecord; tempPassword: string }[] = [];
  const errors: { row: number; matric: string; error: string }[] = [];

  for (const [index, row] of rows.entries()) {
    const result = await createStudentAccount({
      matric: row.matric,
      firstName: row.firstName,
      lastName: row.lastName,
      program: row.program ?? "B.Sc Computer Science",
      email: row.email,
    });

    if ("error" in result) {
      errors.push({ row: index + 1, matric: row.matric, error: result.error });
    } else {
      created.push({ record: result.record, tempPassword: result.tempPassword });
    }
  }

  return { created, errors };
}

export async function updateStudentStatus(
  matric: string,
  status: StudentAccountStatus
): Promise<AdminStudentRecord | null> {
  const updated = await updateStudentStatusRecord(matric, status);
  if (!updated) return null;
  return toAdminRecord(updated);
}

export async function resetStudentToTempPassword(
  matric: string
): Promise<{ tempPassword: string } | null> {
  const norm = normalizeMatric(matric);
  const existing = await getProfileRecordByMatric(norm);
  if (!existing || existing.accountRole !== "STUDENT") return null;

  const tempPassword = generateTempPassword();
  await updateStudentProfileRecord(norm, {
    passwordHash: hashPassword(tempPassword),
    mustChangePassword: true,
    status: existing.status === "suspended" ? "suspended" : "pending",
  });

  return { tempPassword };
}

export async function completeRequiredPasswordChange(
  matric: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const record = await getProfileRecordByMatric(matric);
  if (!record) return { ok: false, error: "Account not found" };
  if (!verifyPassword(currentPassword, record.passwordHash)) {
    return { ok: false, error: "Current password is incorrect" };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters" };
  }

  await updateStudentProfileRecord(matric, {
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
    status: record.status === "pending" ? "active" : record.status,
  });

  return { ok: true };
}

export async function resolveStudentProfile(matric: string): Promise<ResolvedStudentProfile> {
  const norm = normalizeMatric(matric);
  const record = await getResolvedProfileRecord(norm);
  if (record) return record;

  const fallback = STUDENT_DIRECTORY[norm] ?? {
    displayName: norm,
    avatar: norm.slice(0, 2),
    program: "ULA Scholar",
  };
  const names = splitName(fallback.displayName);

  return {
    matric: norm,
    displayName: fallback.displayName,
    firstName: names.firstName,
    lastName: names.lastName,
    avatar: fallback.avatar,
    avatarUrl: undefined,
    program: fallback.program,
    headline: "Verified builder � Live deployable work",
    email: `${norm.toLowerCase()}@student.ula.edu`,
    notifyAssignments: true,
    notifyGrades: true,
    notifyPortfolio: true,
    publicProfile: true,
  };
}

export async function authenticateUser(matric: string, password: string) {
  return authenticateStudent(matric, password);
}

export async function updateStudentProfile(
  matric: string,
  patch: Partial<
    Pick<
      StudentProfileRecord,
      | "headline"
      | "email"
      | "notifyAssignments"
      | "notifyGrades"
      | "notifyPortfolio"
      | "publicProfile"
    >
  >
) {
  const updated = await updateStudentProfileRecord(matric, patch);
  if (!updated) return null;
  return toStudentProfileRecord(updated);
}

export async function changeStudentPassword(
  matric: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const record = await getProfileRecordByMatric(matric);
  if (!record) return { ok: false, error: "Account not found" };
  if (!verifyPassword(currentPassword, record.passwordHash)) {
    return { ok: false, error: "Current password is incorrect" };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters" };
  }
  await updateStudentProfileRecord(matric, {
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
    status: record.status === "pending" ? "active" : record.status,
  });
  return { ok: true };
}
