import { createHash } from "crypto";
import { normalizeMatric } from "@/lib/matric";
import { prisma } from "@/lib/services/prisma";
import { deleteCloudinaryAsset, uploadToCloudinary } from "@/lib/services/cloudinary";
import type { AdminStudentRecord, AdminStats, StudentAccountStatus } from "@/types";

const SALT = "ula-ibbul-v1";

export type StudentProfileCreateInput = {
  matric: string;
  firstName: string;
  lastName: string;
  program: string;
  email?: string;
  passwordHash: string;
  accountRole?: "STUDENT" | "LECTURER" | "ADMIN" | "SUPER_ADMIN";
  status?: StudentAccountStatus;
  mustChangePassword?: boolean;
  headline?: string;
};

export function hashPassword(password: string) {
  return createHash("sha256").update(`${SALT}:${password}`).digest("hex");
}

export function verifyPassword(password: string, hash: string) {
  return hashPassword(password) === hash;
}

function initials(first: string, last: string) {
  const a = first.trim().charAt(0) || "U";
  const b = last.trim().charAt(0) || "L";
  return `${a}${b}`.toUpperCase();
}

function toAdminRecord(record: {
  matric: string;
  firstName: string;
  lastName: string;
  program: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  status: StudentAccountStatus;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
}): AdminStudentRecord {
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

function toResolvedProfile(record: {
  matric: string;
  firstName: string;
  lastName: string;
  program: string;
  headline: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string | null;
  notifyAssignments: boolean;
  notifyGrades: boolean;
  notifyPortfolio: boolean;
  publicProfile: boolean;
  updatedAt: Date;
}) {
  return {
    matric: normalizeMatric(record.matric),
    displayName: `${record.firstName} ${record.lastName}`.trim(),
    firstName: record.firstName,
    lastName: record.lastName,
    avatar: record.avatarInitials,
    avatarUrl: record.avatarUrl ?? undefined,
    program: record.program,
    headline: record.headline,
    email: record.email,
    notifyAssignments: record.notifyAssignments,
    notifyGrades: record.notifyGrades,
    notifyPortfolio: record.notifyPortfolio,
    publicProfile: record.publicProfile,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getProfileRecordByMatric(matric: string) {
  const norm = normalizeMatric(matric);
  return prisma.studentProfile.findUnique({ where: { matric: norm } });
}

export async function listStudentProfilesForAdmin(): Promise<AdminStudentRecord[]> {
  const rows = await prisma.studentProfile.findMany({
    where: { accountRole: "STUDENT" },
    orderBy: { matric: "asc" },
  });
  return rows.map(toAdminRecord);
}

export async function createStudentProfile(data: StudentProfileCreateInput) {
  const norm = normalizeMatric(data.matric);
  const email = (data.email ?? `${norm.replace(/\//g, "-").toLowerCase()}@student.ula.edu`).trim();
  const now = new Date();

  const record = await prisma.studentProfile.create({
    data: {
      matric: norm,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      program: data.program.trim() || "B.Sc Computer Science",
      headline: data.headline ?? "Verified builder · Live deployable work",
      email,
      avatarInitials: initials(data.firstName, data.lastName),
      passwordHash: data.passwordHash,
      accountRole: data.accountRole ?? "STUDENT",
      status: data.status ?? "pending",
      mustChangePassword: data.mustChangePassword ?? true,
      notifyAssignments: true,
      notifyGrades: true,
      notifyPortfolio: true,
      publicProfile: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  return toAdminRecord(record);
}

export async function updateStudentProfileRecord(
  matric: string,
  patch: Partial<{
    headline: string;
    email: string;
    notifyAssignments: boolean;
    notifyGrades: boolean;
    notifyPortfolio: boolean;
    publicProfile: boolean;
    status: StudentAccountStatus;
    mustChangePassword: boolean;
    passwordHash: string;
  }>
) {
  const norm = normalizeMatric(matric);
  const existing = await getProfileRecordByMatric(norm);
  if (!existing) return null;

  const updated = await prisma.studentProfile.update({
    where: { matric: norm },
    data: {
      ...patch,
      updatedAt: new Date(),
    },
  });

  return updated;
}

export async function updateStudentStatusRecord(
  matric: string,
  status: StudentAccountStatus
) {
  return updateStudentProfileRecord(matric, { status });
}

export async function resetStudentPasswordRecord(matric: string, passwordHash: string) {
  return updateStudentProfileRecord(matric, {
    passwordHash,
    mustChangePassword: true,
  });
}

export async function updateStudentAvatar(matric: string, mime: string, buffer: Buffer) {
  const norm = normalizeMatric(matric);
  const existing = await getProfileRecordByMatric(norm);
  if (!existing) return null;

  const upload = await uploadToCloudinary(
    buffer,
    `${norm.replace(/\//g, "-")}-${Date.now()}`,
    "ula/avatars"
  );

  if (existing.avatarUrl && existing.avatarUrl.includes("cloudinary")) {
    const publicId = existing.avatarUrl
      .split("/upload/")[1]
      ?.split("/")
      .slice(1)
      .join("/")
      .replace(/\.[^.]+$/, "");

    if (publicId) {
      await deleteCloudinaryAsset(publicId);
    }
  }

  await prisma.cloudinaryAsset.create({
    data: {
      publicId: upload.public_id,
      secureUrl: upload.secure_url,
      resourceType: upload.resource_type,
      format: upload.format,
      width: upload.width,
      height: upload.height,
      bytes: upload.bytes,
      studentMatric: norm,
    },
  });

  await prisma.studentProfile.update({
    where: { matric: norm },
    data: {
      avatarUrl: upload.secure_url,
      updatedAt: new Date(),
    },
  });

  return { avatarUrl: upload.secure_url };
}

export async function removeStudentAvatarRecord(matric: string) {
  const norm = normalizeMatric(matric);
  const existing = await getProfileRecordByMatric(norm);
  if (!existing) return null;

  if (existing.avatarUrl && existing.avatarUrl.includes("cloudinary")) {
    const publicId = existing.avatarUrl
      .split("/upload/")[1]
      ?.split("/")
      .slice(1)
      .join("/")
      .replace(/\.[^.]+$/, "");

    if (publicId) {
      await deleteCloudinaryAsset(publicId);
    }
  }

  await prisma.cloudinaryAsset.deleteMany({ where: { studentMatric: norm } });
  const updated = await prisma.studentProfile.update({
    where: { matric: norm },
    data: {
      avatarUrl: null,
      updatedAt: new Date(),
    },
  });

  return updated;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [totalStudents, active, pending, suspended, mustChangePassword] = await Promise.all([
    prisma.studentProfile.count({ where: { accountRole: "STUDENT" } }),
    prisma.studentProfile.count({ where: { accountRole: "STUDENT", status: "active" } }),
    prisma.studentProfile.count({ where: { accountRole: "STUDENT", status: "pending" } }),
    prisma.studentProfile.count({ where: { accountRole: "STUDENT", status: "suspended" } }),
    prisma.studentProfile.count({ where: { accountRole: "STUDENT", mustChangePassword: true } }),
  ]);

  return {
    totalStudents,
    active,
    pending,
    suspended,
    mustChangePassword,
    registeredToday: await prisma.studentProfile.count({
      where: {
        accountRole: "STUDENT",
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  };
}

export async function getResolvedProfileRecord(matric: string) {
  const norm = normalizeMatric(matric);
  const row = await getProfileRecordByMatric(norm);
  if (!row) return null;
  return toResolvedProfile(row);
}

type BootstrapAccountConfig = {
  role: "SUPER_ADMIN" | "ADMIN" | "LECTURER";
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  matric: string;
  program: string;
  headline: string;
  notifyAssignments: boolean;
  notifyGrades: boolean;
  notifyPortfolio: boolean;
  publicProfile: boolean;
  mustChangePassword: boolean;
};

function getBootstrapConfig(): BootstrapAccountConfig[] {
  return [
    {
      role: "SUPER_ADMIN",
      username: process.env.BOOTSTRAP_SUPER_ADMIN_USERNAME ?? "superadmin",
      email: process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? `${process.env.BOOTSTRAP_SUPER_ADMIN_USERNAME ?? "superadmin"}@ula.edu`,
      password: process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!",
      firstName: "Super",
      lastName: "Admin",
      matric: process.env.BOOTSTRAP_SUPER_ADMIN_MATRIC ?? "SUPERADMIN001",
      program: "ULA Platform",
      headline: "Platform super administrator",
      notifyAssignments: false,
      notifyGrades: false,
      notifyPortfolio: false,
      publicProfile: false,
      mustChangePassword: false,
    },
    {
      role: "ADMIN",
      username: process.env.BOOTSTRAP_ADMIN_USERNAME ?? "admin",
      email: process.env.BOOTSTRAP_ADMIN_EMAIL ?? `${process.env.BOOTSTRAP_ADMIN_USERNAME ?? "admin"}@ula.edu`,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "Admin123!",
      firstName: "Platform",
      lastName: "Admin",
      matric: process.env.BOOTSTRAP_ADMIN_MATRIC ?? "ADMIN001",
      program: "ULA Platform",
      headline: "Platform administrator",
      notifyAssignments: false,
      notifyGrades: false,
      notifyPortfolio: false,
      publicProfile: false,
      mustChangePassword: false,
    },
    {
      role: "LECTURER",
      username: process.env.BOOTSTRAP_LECTURER_USERNAME ?? "lecturer",
      email: process.env.BOOTSTRAP_LECTURER_EMAIL ?? `${process.env.BOOTSTRAP_LECTURER_USERNAME ?? "lecturer"}@ula.edu`,
      password: process.env.BOOTSTRAP_LECTURER_PASSWORD ?? "Lecturer123!",
      firstName: "Sample",
      lastName: "Lecturer",
      matric: process.env.BOOTSTRAP_LECTURER_MATRIC ?? "LEC001",
      program: "Teaching & Learning",
      headline: "Course lecturer",
      notifyAssignments: true,
      notifyGrades: true,
      notifyPortfolio: false,
      publicProfile: false,
      mustChangePassword: false,
    },
  ];
}

function buildBootstrapMatric(matric: string, role: BootstrapAccountConfig["role"]) {
  const normalized = normalizeMatric(matric);
  if (role === "SUPER_ADMIN") {
    return normalized.startsWith("SUPER") ? normalized : normalizeMatric("SUPERADMIN001");
  }
  if (role === "ADMIN") {
    return normalized.startsWith("ADMIN") ? normalized : normalizeMatric("ADMIN001");
  }
  return normalized.startsWith("LEC") ? normalized : normalizeMatric("LEC001");
}

export async function ensureBootstrapAccounts(): Promise<boolean> {
  try {
    const existingPlatformAdmins = await prisma.studentProfile.findFirst({
      where: { accountRole: { in: ["SUPER_ADMIN", "ADMIN"] } },
      select: { matric: true, accountRole: true },
    });

    if (existingPlatformAdmins) {
      console.log("Bootstrap accounts already exist.");
      return false;
    }

    const requiredAccounts = getBootstrapConfig();
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const account of requiredAccounts) {
        const normalizedMatric = buildBootstrapMatric(account.matric, account.role);
        const avatarInitials = `${account.firstName.charAt(0) ?? "U"}${account.lastName.charAt(0) ?? "L"}`.toUpperCase();
        await tx.studentProfile.create({
          data: {
            matric: normalizedMatric,
            firstName: account.firstName,
            lastName: account.lastName,
            program: account.program,
            headline: account.headline,
            email: account.email,
            avatarInitials,
            passwordHash: hashPassword(account.password),
            accountRole: account.role,
            status: "active",
            mustChangePassword: account.mustChangePassword,
            notifyAssignments: account.notifyAssignments,
            notifyGrades: account.notifyGrades,
            notifyPortfolio: account.notifyPortfolio,
            publicProfile: account.publicProfile,
            createdAt: now,
            updatedAt: now,
          },
        });
        if (account.role === "SUPER_ADMIN") {
          console.log("✓ Super Admin created");
        } else if (account.role === "ADMIN") {
          console.log("✓ Admin created");
        } else {
          console.log("✓ Lecturer created");
        }
      }
    });

    return true;
  } catch (err) {
    console.warn("Bootstrap accounts skipped due to startup issue:", err);
    return false;
  }
}

export async function authenticateStudent(matric: string, password: string) {
  const norm = normalizeMatric(matric);
  const record = await getProfileRecordByMatric(norm);
  if (!record || !verifyPassword(password, record.passwordHash)) return null;
  if (record.status === "suspended") return null;

  const now = new Date();
  const updated = await prisma.studentProfile.update({
    where: { matric: norm },
    data: {
      lastLoginAt: now,
      updatedAt: now,
    },
  });

  return {
    id: `user-${norm}`,
    matricNumber: norm,
    firstName: updated.firstName,
    lastName: updated.lastName,
    role: updated.accountRole,
    institutionId: "inst-1",
    avatarUrl: updated.avatarUrl ?? undefined,
    program: updated.program,
    headline: updated.headline,
    mustChangePassword: updated.mustChangePassword,
  };
}
