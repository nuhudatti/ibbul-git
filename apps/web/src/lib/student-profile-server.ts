import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { DEMO_USERS } from "@/lib/mock-data";
import {
  isValidStudentMatric,
  matricToSlug,
  normalizeMatric,
  parseMatricParts,
} from "@/lib/matric";
import { registerStudentInDirectory, STUDENT_DIRECTORY } from "@/lib/student-directory";
import { generateTempPassword } from "@/lib/temp-password";
import type { AdminStats, AdminStudentRecord, StudentAccountStatus } from "@/types";
import {
  deleteAvatarFile,
  getAvatarPublicUrl,
  readAvatarFile,
  saveAvatarFile,
} from "@/lib/student-avatar-storage";

export type AccountRole = "STUDENT" | "LECTURER" | "ADMIN";

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

/** Survive Next.js dev hot reload (in-memory until process exit) */
const profileGlobal = globalThis as unknown as {
  ulaStudentProfiles?: Map<string, StudentProfileRecord>;
};

function getProfilesMap(): Map<string, StudentProfileRecord> {
  if (!profileGlobal.ulaStudentProfiles) {
    profileGlobal.ulaStudentProfiles = new Map();
  }
  return profileGlobal.ulaStudentProfiles;
}

const profiles = getProfilesMap();
const SALT = "ula-ibbul-v1";
let lastProvisionedAt: string | undefined;

const PROFILE_DATA_DIR = join(process.cwd(), ".data");
const PROFILE_DATA_FILE = join(PROFILE_DATA_DIR, "student-profiles.json");

function ensureProfileDataDirectory() {
  if (!existsSync(PROFILE_DATA_DIR)) {
    mkdirSync(PROFILE_DATA_DIR, { recursive: true });
  }
}

function loadProfilesFromDisk() {
  ensureProfileDataDirectory();
  if (!existsSync(PROFILE_DATA_FILE)) return;
  try {
    const raw = readFileSync(PROFILE_DATA_FILE, "utf-8");
    const saved: StudentProfileRecord[] = JSON.parse(raw);
    saved.forEach((record) => profiles.set(normalizeMatric(record.matric), record));
  } catch {
    /* ignore invalid file */
  }
}

function persistProfilesToDisk() {
  ensureProfileDataDirectory();
  try {
    writeFileSync(PROFILE_DATA_FILE, JSON.stringify([...profiles.values()], null, 2), "utf-8");
  } catch {
    /* ignore write failures */
  }
}

loadProfilesFromDisk();

function initials(first: string, last: string) {
  const a = first.trim().charAt(0) || "U";
  const b = last.trim().charAt(0) || "L";
  return `${a}${b}`.toUpperCase();
}

function resolveAvatarUrl(matric: string, recordUrl?: string): string | undefined {
  const disk = getAvatarPublicUrl(matric);
  if (disk) return disk;
  // If a data URL was stored (production fallback), return it directly.
  if (recordUrl?.startsWith("data:")) return recordUrl;
  if (recordUrl?.startsWith("/uploads/")) return recordUrl.split("?")[0];
  if (recordUrl?.startsWith("http://") || recordUrl?.startsWith("https://")) return recordUrl;
  return undefined;
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(`${SALT}:${password}`).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}


function toAdminRecord(record: StudentProfileRecord): AdminStudentRecord {
  const avatarUrl = resolveAvatarUrl(normalizeMatric(record.matric), record.avatarUrl);
  return {
    matric: normalizeMatric(record.matric),
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: `${record.firstName} ${record.lastName}`.trim(),
    program: record.program,
    email: record.email,
    avatar: record.avatarInitials,
    avatarUrl,
    status: record.status,
    mustChangePassword: record.mustChangePassword,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastLoginAt: record.lastLoginAt,
    hasCustomPassword: !record.mustChangePassword,
  };
}

/** Ensure every directory student has a profile (fixes missing roster after format migrations) */
export function syncDirectoryProfiles() {
  Object.entries(STUDENT_DIRECTORY).forEach(([matric, entry]) => {
    const norm = normalizeMatric(matric);
    if (profiles.has(norm)) return;

    const demo = DEMO_USERS[norm] ?? DEMO_USERS[matric];
    const { firstName, lastName } = demo
      ? { firstName: demo.firstName, lastName: demo.lastName }
      : splitName(entry.displayName);

    profiles.set(norm, {
      matric: norm,
      firstName,
      lastName,
      program: entry.program,
      headline: "Verified builder · Live deployable work",
      email: `${matric.replace(/\//g, "-").toLowerCase()}@student.ula.edu`,
      avatarInitials: entry.avatar,
      passwordHash: hashPassword(demo?.password ?? "student123"),
      accountRole: "STUDENT",
      status: "active",
      mustChangePassword: false,
      notifyAssignments: true,
      notifyGrades: true,
      notifyPortfolio: true,
      publicProfile: true,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

function seedStaffAccounts() {
  const lecturer = DEMO_USERS.LEC001;
  if (lecturer && !profiles.has("LEC001")) {
    profiles.set("LEC001", {
      matric: "LEC001",
      firstName: lecturer.firstName,
      lastName: lecturer.lastName,
      program: "Faculty · Computer Science",
      headline: "Lecturer · Project ULA",
      email: "lecturer@ula.edu",
      avatarInitials: "SO",
      passwordHash: hashPassword(lecturer.password),
      accountRole: "LECTURER",
      status: "active",
      mustChangePassword: false,
      notifyAssignments: true,
      notifyGrades: true,
      notifyPortfolio: false,
      publicProfile: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const admin = DEMO_USERS.ADMIN001;
  if (admin && !profiles.has("ADMIN001")) {
    profiles.set("ADMIN001", {
      matric: "ADMIN001",
      firstName: admin.firstName,
      lastName: admin.lastName,
      program: "ULA Platform Operations",
      headline: "Super Administrator · Project ULA",
      email: "admin@ula.edu",
      avatarInitials: "SA",
      passwordHash: hashPassword(admin.password),
      accountRole: "ADMIN",
      status: "active",
      mustChangePassword: false,
      notifyAssignments: false,
      notifyGrades: false,
      notifyPortfolio: false,
      publicProfile: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export function seedStudentProfiles() {
  syncDirectoryProfiles();
  seedStaffAccounts();
}

export function getProfileRecord(matric: string): StudentProfileRecord | null {
  seedStudentProfiles();
  return profiles.get(normalizeMatric(matric)) ?? null;
}

export function listStudentProfiles(): AdminStudentRecord[] {
  seedStudentProfiles();
  return [...profiles.values()]
    .filter((p) => p.accountRole === "STUDENT")
    .sort((a, b) => a.matric.localeCompare(b.matric))
    .map(toAdminRecord);
}

export function getAdminStats(): AdminStats {
  seedStudentProfiles();
  const students = [...profiles.values()].filter((p) => p.accountRole === "STUDENT");
  const today = new Date().toDateString();
  return {
    totalStudents: students.length,
    active: students.filter((s) => s.status === "active").length,
    pending: students.filter((s) => s.status === "pending").length,
    suspended: students.filter((s) => s.status === "suspended").length,
    mustChangePassword: students.filter((s) => s.mustChangePassword).length,
    registeredToday: students.filter(
      (s) => new Date(s.createdAt).toDateString() === today
    ).length,
    lastProvisionedAt,
  };
}

export function createStudentAccount(input: {
  matric: string;
  firstName: string;
  lastName: string;
  program: string;
  email?: string;
  tempPassword?: string;
}): { record: AdminStudentRecord; tempPassword: string } | { error: string } {
  seedStudentProfiles();
  const matric = normalizeMatric(input.matric);
  if (!isValidStudentMatric(matric)) {
    return {
      error: `Invalid matric format. Use U{year}/{faculty}/{department}/{number} (e.g. U22/FNS/CSC/1105)`,
    };
  }
  if (!parseMatricParts(matric)) {
    return { error: "Could not parse matric components" };
  }
  if (profiles.has(matric)) {
    return { error: `Student ${matric} already exists` };
  }

  const tempPassword = input.tempPassword ?? generateTempPassword();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const now = new Date().toISOString();

  const record: StudentProfileRecord = {
    matric,
    firstName,
    lastName,
    program: input.program.trim() || "B.Sc Computer Science",
    headline: "Verified builder · Live deployable work",
    email: input.email?.trim() || `${matricToSlug(matric).toLowerCase()}@student.ula.edu`,
    avatarInitials: initials(firstName, lastName),
    passwordHash: hashPassword(tempPassword),
    accountRole: "STUDENT",
    status: "pending",
    mustChangePassword: true,
    notifyAssignments: true,
    notifyGrades: true,
    notifyPortfolio: true,
    publicProfile: true,
    createdAt: now,
    updatedAt: now,
  };

  profiles.set(matric, record);
  registerStudentInDirectory(matric, {
    displayName: `${firstName} ${lastName}`.trim(),
    avatar: record.avatarInitials,
    program: record.program,
  });
  persistProfilesToDisk();
  lastProvisionedAt = now;

  return { record: toAdminRecord(record), tempPassword };
}

export function bulkCreateStudents(
  rows: {
    matric: string;
    firstName: string;
    lastName: string;
    program?: string;
    email?: string;
  }[]
): {
  created: { record: AdminStudentRecord; tempPassword: string }[];
  errors: { row: number; matric: string; error: string }[];
} {
  const created: { record: AdminStudentRecord; tempPassword: string }[] = [];
  const errors: { row: number; matric: string; error: string }[] = [];

  rows.forEach((row, i) => {
    const result = createStudentAccount({
      matric: row.matric,
      firstName: row.firstName,
      lastName: row.lastName,
      program: row.program ?? "B.Sc Computer Science",
      email: row.email,
    });
    if ("error" in result) {
      errors.push({ row: i + 1, matric: row.matric, error: result.error });
    } else {
      created.push({ record: result.record, tempPassword: result.tempPassword });
    }
  });

  return { created, errors };
}

export function updateStudentStatus(
  matric: string,
  status: StudentAccountStatus
): AdminStudentRecord | null {
  const norm = normalizeMatric(matric);
  const record = getProfileRecord(norm);
  if (!record || record.accountRole !== "STUDENT") return null;
  const updated = {
    ...record,
    status,
    updatedAt: new Date().toISOString(),
  };
  profiles.set(norm, updated);
  persistProfilesToDisk();
  return toAdminRecord(updated);
}

export function resetStudentToTempPassword(matric: string): { tempPassword: string } | null {
  const norm = normalizeMatric(matric);
  const record = getProfileRecord(norm);
  if (!record || record.accountRole !== "STUDENT") return null;

  const tempPassword = generateTempPassword();
  profiles.set(norm, {
    ...record,
    passwordHash: hashPassword(tempPassword),
    mustChangePassword: true,
    status: record.status === "suspended" ? "suspended" : "pending",
    updatedAt: new Date().toISOString(),
  });
  persistProfilesToDisk();
  return { tempPassword };
}

export function completeRequiredPasswordChange(
  matric: string,
  currentPassword: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const record = getProfileRecord(matric);
  if (!record) return { ok: false, error: "Account not found" };
  if (!verifyPassword(currentPassword, record.passwordHash)) {
    return { ok: false, error: "Current password is incorrect" };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters" };
  }

  const norm = normalizeMatric(matric);
  profiles.set(norm, {
    ...record,
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
    status: record.status === "pending" ? "active" : record.status,
    updatedAt: new Date().toISOString(),
  });
  persistProfilesToDisk();
  return { ok: true };
}

export function resolveStudentProfile(matric: string): ResolvedStudentProfile {
  seedStudentProfiles();
  const norm = normalizeMatric(matric);
  const base = STUDENT_DIRECTORY[norm];
  const record = profiles.get(norm);

  if (record) {
    const avatarUrl = resolveAvatarUrl(norm, record.avatarUrl);
    if (avatarUrl && record.avatarUrl !== avatarUrl) {
      profiles.set(norm, { ...record, avatarUrl });
    }
    return {
      matric: norm,
      displayName: `${record.firstName} ${record.lastName}`.trim(),
      firstName: record.firstName,
      lastName: record.lastName,
      avatar: record.avatarInitials,
      avatarUrl,
      program: record.program,
      headline: record.headline,
      email: record.email,
      notifyAssignments: record.notifyAssignments,
      notifyGrades: record.notifyGrades,
      notifyPortfolio: record.notifyPortfolio,
      publicProfile: record.publicProfile,
    };
  }

  const fallback = base ?? {
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
    avatarUrl: getAvatarPublicUrl(norm),
    program: fallback.program,
    headline: "Verified builder · Live deployable work",
    email: `${norm.toLowerCase()}@student.ula.edu`,
    notifyAssignments: true,
    notifyGrades: true,
    notifyPortfolio: true,
    publicProfile: true,
  };
}

export function authenticateUser(matric: string, password: string) {
  seedStudentProfiles();
  const norm = normalizeMatric(matric);
  const record = profiles.get(norm);
  if (!record || !verifyPassword(password, record.passwordHash)) return null;
  if (record.status === "suspended") return null;

  const role = record.accountRole;
  if (role === "STUDENT" && !isValidStudentMatric(norm)) return null;

  const avatarUrl = resolveAvatarUrl(norm, record.avatarUrl);
  const now = new Date().toISOString();
  profiles.set(norm, { ...record, lastLoginAt: now, updatedAt: now });

  return {
    id: `user-${norm}`,
    matricNumber: norm,
    firstName: record.firstName,
    lastName: record.lastName,
    role,
    institutionId: "inst-1",
    avatarUrl,
    program: record.program,
    headline: record.headline,
    mustChangePassword: record.mustChangePassword,
  };
}

export function updateStudentProfile(
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
  seedStudentProfiles();
  const norm = normalizeMatric(matric);
  const record = profiles.get(norm);
  if (!record) return null;

  const updated: StudentProfileRecord = {
    ...record,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  profiles.set(norm, updated);
  persistProfilesToDisk();
  return updated;
}

export function changeStudentPassword(
  matric: string,
  currentPassword: string,
  newPassword: string
): { ok: boolean; error?: string } {
  const record = getProfileRecord(matric);
  if (!record) return { ok: false, error: "Account not found" };
  if (!verifyPassword(currentPassword, record.passwordHash)) {
    return { ok: false, error: "Current password is incorrect" };
  }
  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters" };
  }
  const norm = normalizeMatric(matric);
  profiles.set(norm, {
    ...record,
    passwordHash: hashPassword(newPassword),
    mustChangePassword: false,
    status: record.status === "pending" ? "active" : record.status,
    updatedAt: new Date().toISOString(),
  });
  persistProfilesToDisk();
  return { ok: true };
}

export function setStudentAvatar(matric: string, mime: string, buffer: Buffer) {
  seedStudentProfiles();
  const norm = normalizeMatric(matric);
  const record = profiles.get(norm);
  if (!record) return null;

  const avatarUrl = saveAvatarFile(norm, mime, buffer);
  const updated = { ...record, avatarUrl, updatedAt: new Date().toISOString() };
  profiles.set(norm, updated);
  persistProfilesToDisk();
  // If the saved avatar is a data URL, don't append cache-busting query string.
  if (typeof avatarUrl === "string" && avatarUrl.startsWith("data:")) {
    return { avatarUrl };
  }
  return { avatarUrl: `${avatarUrl}?v=${Date.now()}` };
}

export function getStudentAvatar(matric: string) {
  return readAvatarFile(matric);
}

export function removeStudentAvatar(matric: string) {
  const norm = normalizeMatric(matric);
  deleteAvatarFile(norm);
  const record = profiles.get(norm);
  if (!record) return null;
  const updated = { ...record, avatarUrl: undefined, updatedAt: new Date().toISOString() };
  profiles.set(norm, updated);
  persistProfilesToDisk();
  return updated;
}
