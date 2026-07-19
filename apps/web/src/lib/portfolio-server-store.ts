import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { PortfolioArtifact, PortfolioFeedEvent } from "@/types";
import { normalizeMatric } from "@/lib/matric";
import { listStudentProfiles } from "@/lib/student-profile-server";

const DATA_DIR = join(process.cwd(), ".data");
const ARTIFACTS_FILE = join(DATA_DIR, "portfolio-artifacts.json");
const FEED_FILE = join(DATA_DIR, "portfolio-feed.json");

const artifacts = new Map<string, PortfolioArtifact>();
const feed: PortfolioFeedEvent[] = [];

function ensureDataDirectory() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStoreFromDisk() {
  ensureDataDirectory();

  if (existsSync(ARTIFACTS_FILE)) {
    try {
      const raw = readFileSync(ARTIFACTS_FILE, "utf-8");
      const saved: PortfolioArtifact[] = JSON.parse(raw);
      saved.forEach((artifact) => artifacts.set(artifact.id, artifact));
    } catch {
      /* ignore invalid file */
    }
  }

  if (existsSync(FEED_FILE)) {
    try {
      const raw = readFileSync(FEED_FILE, "utf-8");
      const saved: PortfolioFeedEvent[] = JSON.parse(raw);
      feed.push(...saved.slice(0, 80));
    } catch {
      /* ignore invalid file */
    }
  }
}

function persistStoreToDisk() {
  ensureDataDirectory();
  try {
    writeFileSync(ARTIFACTS_FILE, JSON.stringify([...artifacts.values()], null, 2), "utf-8");
  } catch {
    /* ignore write failures */
  }
  try {
    writeFileSync(FEED_FILE, JSON.stringify(feed.slice(0, 80), null, 2), "utf-8");
  } catch {
    /* ignore write failures */
  }
}

loadStoreFromDisk();

export function upsertServerArtifact(artifact: PortfolioArtifact) {
  artifacts.set(artifact.id, artifact);
  const key = normalizeMatric(artifact.studentMatric);
  feed.unshift({
    id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: artifact.verified ? "verify" : artifact.deployUrl ? "deploy" : "submit",
    studentMatric: key,
    studentName: artifact.studentName,
    title: artifact.title,
    message: artifact.verified
      ? `verified ${artifact.title}`
      : artifact.deployUrl
        ? `deployed ${artifact.title}`
        : `submitted ${artifact.title}`,
    timestamp: new Date().toISOString(),
    artifactId: artifact.id,
    score: artifact.score ?? undefined,
  });
  if (feed.length > 80) feed.length = 80;
  persistStoreToDisk();
}

export function getArtifactsByMatric(matric: string): PortfolioArtifact[] {
  const key = normalizeMatric(matric);
  return [...artifacts.values()]
    .filter((a) => normalizeMatric(a.studentMatric) === key)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getArtifactById(id: string) {
  return artifacts.get(id);
}

function normalizeDeployUrl(deployUrl: string) {
  const normalized = deployUrl.toLowerCase().trim().replace(/\/+$/, "");
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      return new URL(normalized).pathname.replace(/\/+$/, "");
    } catch {
      return normalized;
    }
  }
  return normalized;
}

export function getArtifactByDeployUrl(deployUrl: string) {
  const target = normalizeDeployUrl(deployUrl);
  return [...artifacts.values()].find((artifact) =>
    artifact.deployUrl ? normalizeDeployUrl(artifact.deployUrl) === target : false
  );
}

export function getGlobalFeed(limit = 24): PortfolioFeedEvent[] {
  return feed.slice(0, limit);
}

export function getAllArtifacts(): PortfolioArtifact[] {
  return [...artifacts.values()];
}

export function verifyServerArtifact(
  id: string,
  lecturerId: string,
  lecturerName: string,
  approved: boolean,
  note?: string
) {
  const a = artifacts.get(id);
  if (!a) return null;
  const updated: PortfolioArtifact = {
    ...a,
    verified: approved,
    status: approved ? "VERIFIED" : "REJECTED",
    verifiedAt: new Date().toISOString(),
    lecturerId,
    lecturerName,
    lecturerNote: note,
  };
  artifacts.set(id, updated);
  if (approved) {
    feed.unshift({
      id: `feed-v-${Date.now()}`,
      type: "verify",
      studentMatric: a.studentMatric,
      studentName: a.studentName,
      title: a.title,
      message: `lecturer verified ${a.title}`,
      timestamp: new Date().toISOString(),
      artifactId: id,
      score: a.score ?? undefined,
    });
  }
  persistStoreToDisk();
  return updated;
}

/** Seed demo artifacts for public profiles */
export function seedDemoPortfolio() {
  // If we already have many verified artifacts, skip seeding.
  const verifiedCount = [...artifacts.values()].filter((a) => a.verified).length;
  if (verifiedCount >= 3) return;
  try {
    const roster = listStudentProfiles();
    if (roster && roster.length > 120 && verifiedCount > 0) return; // large real roster exists
  } catch {
    // ignore errors when checking roster (keep seed fallback)
  }
  const demos: PortfolioArtifact[] = [
    {
      id: "art-demo-1",
      studentMatric: "U22/FNS/CSC/1103",
      studentName: "Chidi Okafor",
      assignmentId: "asn-1",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Personal Portfolio Website",
      score: 92,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1103/proj-demo-001",
      timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
      submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      verified: true,
      verifiedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      lecturerId: "LEC001",
      lecturerName: "Nuhu Muhammad Datti",
      hash: "9f3a8c1e21b4d7f0",
      status: "VERIFIED",
      skills: ["HTML", "CSS", "JavaScript", "Responsive Design"],
      thumbnailGradient: "from-cyan-500/30 to-violet-600/30",
    },
    {
      id: "art-demo-2",
      studentMatric: "U22/FNS/CSC/1102",
      studentName: "Amina Yusuf",
      assignmentId: "asn-1",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Personal Portfolio Website",
      score: 87,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1102/asn-1",
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      verified: true,
      verifiedAt: new Date(Date.now() - 86400000).toISOString(),
      lecturerId: "LEC001",
      lecturerName: "Nuhu Muhammad Datti",
      hash: "a1b2c3d4e5f67890",
      status: "VERIFIED",
      skills: ["HTML", "CSS", "Layout", "Accessibility"],
      thumbnailGradient: "from-emerald-500/25 to-cyan-500/25",
    },
    {
      id: "art-demo-3",
      studentMatric: "U22/FNS/CSC/1101",
      studentName: "Nuhu Ibrahim",
      assignmentId: "asn-2",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Interactive Calculator App",
      score: 94,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1101/calc-001",
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      verified: true,
      verifiedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      lecturerId: "LEC001",
      lecturerName: "Nuhu Muhammad Datti",
      hash: "f4e8b2c19d0a7e31",
      status: "VERIFIED",
      skills: ["JavaScript", "DOM", "Logic"],
      thumbnailGradient: "from-amber-500/20 to-cyan-500/25",
    },
  ];
  demos.forEach(upsertServerArtifact);
  seedNetworkPulseFeed();
}

/** Rich synthetic feed so the homepage stream feels alive on first load */
export function seedNetworkPulseFeed() {
  if (feed.length >= 10) return;
  const pulses: Omit<PortfolioFeedEvent, "id">[] = [
    {
      type: "portfolio",
      studentMatric: "U22/FNS/CSC/1104",
      studentName: "Fatima Bello",
      title: "ULA public profile",
      message: "published verified developer identity",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      type: "submit",
      studentMatric: "U22/FNS/CSC/1105",
      studentName: "Emeka Nwosu",
      title: "REST API Client",
      message: "submitted REST API Client",
      timestamp: new Date(Date.now() - 5400000).toISOString(),
    },
    {
      type: "deploy",
      studentMatric: "U22/FNS/CSC/1105",
      studentName: "Emeka Nwosu",
      title: "REST API Client",
      message: "deployed live preview to ULA edge",
      timestamp: new Date(Date.now() - 4800000).toISOString(),
    },
    {
      type: "grade",
      studentMatric: "U22/FNS/CSC/1106",
      studentName: "Zainab Ahmed",
      title: "Security Audit Lab",
      message: "received provisional score 88%",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      score: 88,
    },
    {
      type: "verify",
      studentMatric: "U22/FNS/CSC/1103",
      studentName: "Chidi Okafor",
      title: "Personal Portfolio Website",
      message: "lecturer verified Personal Portfolio Website",
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      artifactId: "art-demo-1",
      score: 92,
    },
    {
      type: "deploy",
      studentMatric: "U22/FNS/CSC/1101",
      studentName: "Nuhu Ibrahim",
      title: "Interactive Calculator App",
      message: "deployed Interactive Calculator App",
      timestamp: new Date(Date.now() - 2400000).toISOString(),
      artifactId: "art-demo-3",
    },
    {
      type: "submit",
      studentMatric: "U22/FNS/CSC/1106",
      studentName: "Zainab Ahmed",
      title: "Network Scanner UI",
      message: "submitted Network Scanner UI",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      type: "portfolio",
      studentMatric: "U22/FNS/CSC/1102",
      studentName: "Amina Yusuf",
      title: "Credential QR",
      message: "activated public verification QR",
      timestamp: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      type: "verify",
      studentMatric: "U22/FNS/CSC/1102",
      studentName: "Amina Yusuf",
      title: "Personal Portfolio Website",
      message: "lecturer verified Personal Portfolio Website",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      artifactId: "art-demo-2",
      score: 87,
    },
    {
      type: "deploy",
      studentMatric: "U22/FNS/CSC/1104",
      studentName: "Fatima Bello",
      title: "Data Dashboard",
      message: "deployed Data Dashboard",
      timestamp: new Date(Date.now() - 600000).toISOString(),
    },
    {
      type: "submit",
      studentMatric: "U22/FNS/CSC/1104",
      studentName: "Fatima Bello",
      title: "Data Dashboard",
      message: "submitted Data Dashboard",
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
  ];
  pulses.forEach((p, i) => {
    feed.push({
      ...p,
      id: `feed-seed-${i}-${p.studentMatric}`,
    });
  });
  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
