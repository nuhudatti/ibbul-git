import { normalizeMatric } from "@/lib/matric";
import { getAllArtifacts, getGlobalFeed, seedDemoPortfolio } from "@/lib/portfolio-server-store";
import { resolveStudentProfile, listStudentProfiles } from "@/lib/student-profile-server";
import type { PortfolioArtifact } from "@/types";

export type BuilderStatus = "verified" | "building" | "emerging";

export interface CohortBuilder {
  matric: string;
  displayName: string;
  avatar: string;
  avatarUrl?: string;
  program: string;
  headline: string;
  verifiedCount: number;
  totalArtifacts: number;
  liveDeploys: number;
  avgScore: number | null;
  topProject?: string;
  topScore?: number;
  lastActive: string;
  status: BuilderStatus;
  skills: string[];
}

export interface CohortStats {
  totalBuilders: number;
  verifiedBuilders: number;
  totalArtifacts: number;
  verifiedArtifacts: number;
  liveDeploys: number;
  networkAvgScore: number | null;
}

export function buildCohortRegistry(): {
  builders: CohortBuilder[];
  stats: CohortStats;
} {
  seedDemoPortfolio();
  const allArtifacts = getAllArtifacts();

  const directoryMatrics = listStudentProfiles().map((s) => normalizeMatric(s.matric));
  const artifactMatrics = Array.from(
    new Set(allArtifacts.map((a) => normalizeMatric(a.studentMatric)))
  );
  const studentMatrics = [...directoryMatrics];
  artifactMatrics.forEach((matric) => {
    if (!studentMatrics.includes(matric)) {
      studentMatrics.push(matric);
    }
  });

  const builders: CohortBuilder[] = studentMatrics.map((matric) => {
    const norm = normalizeMatric(matric);
    const profile = resolveStudentProfile(norm);
    const artifacts = allArtifacts
      .filter((a) => normalizeMatric(a.studentMatric) === norm)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const verified = artifacts.filter((a) => a.verified);
    const scores = artifacts.filter((a) => a.score != null).map((a) => a.score!);
    const latest = artifacts[0];
    const topScored = [...artifacts]
      .filter((a) => a.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

    const skillSet = new Set<string>();
    artifacts.forEach((a) => a.skills.forEach((s) => skillSet.add(s)));

    let status: BuilderStatus = "emerging";
    if (verified.length > 0) status = "verified";
    else if (artifacts.length > 0) status = "building";

    return {
      matric: norm,
      displayName: profile.displayName,
      avatar: profile.avatar,
      avatarUrl: profile.avatarUrl,
      program: profile.program,
      headline: profile.headline,
      verifiedCount: verified.length,
      totalArtifacts: artifacts.length,
      liveDeploys: artifacts.filter((a) => a.deployUrl).length,
      avgScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
      topProject: topScored?.title ?? latest?.title,
      topScore: topScored?.score ?? undefined,
      lastActive: latest?.timestamp ?? new Date(0).toISOString(),
      status,
      skills: [...skillSet].slice(0, 6),
    };
  });

  builders.sort((a, b) => {
    if (b.verifiedCount !== a.verifiedCount) return b.verifiedCount - a.verifiedCount;
    if (b.totalArtifacts !== a.totalArtifacts) return b.totalArtifacts - a.totalArtifacts;
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  });

  const verifiedArtifacts = allArtifacts.filter((a) => a.verified).length;
  const allScores = allArtifacts.filter((a) => a.score != null).map((a) => a.score!);

  const stats: CohortStats = {
    totalBuilders: builders.length,
    verifiedBuilders: builders.filter((b) => b.status === "verified").length,
    totalArtifacts: allArtifacts.length,
    verifiedArtifacts,
    liveDeploys: allArtifacts.filter((a) => a.deployUrl).length,
    networkAvgScore: allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null,
  };

  return { builders, stats };
}

export function getCohortFeed() {
  seedDemoPortfolio();
  return getGlobalFeed(40);
}

/** Verified artifacts for the live interactive hero */
export function getHeroArtifacts(limit = 8): PortfolioArtifact[] {
  seedDemoPortfolio();
  const allArtifacts = getAllArtifacts();
  const verified = allArtifacts
    .filter((a) => a.verified)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (verified.length >= 3) return verified.slice(0, limit);

  const artifactMatrics = Array.from(
    new Set(allArtifacts.map((a) => normalizeMatric(a.studentMatric)))
  );
  const extraMatrics = [...listStudentProfiles().map((s) => normalizeMatric(s.matric)), ...artifactMatrics].filter(
    (m, index, self) => self.indexOf(m) === index &&
      !verified.some((a) => normalizeMatric(a.studentMatric) === m)
  );

  const extras: PortfolioArtifact[] = extraMatrics
    .slice(0, limit - verified.length)
    .map((matric, i) => {
      const profile = resolveStudentProfile(matric);
      return {
        id: `hero-preview-${matric}`,
        studentMatric: matric,
        studentName: profile.displayName,
        assignmentId: "asn-preview",
        courseId: "CS101-WebDev",
        courseName: "Web Development",
        title: "Portfolio artifact in progress",
        score: null,
        maxScore: 100,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        submittedAt: new Date().toISOString(),
        verified: false,
        hash: "a1b2c3d4e5f67890",
        status: "SUBMITTED" as const,
        skills: ["HTML", "CSS"],
        thumbnailGradient: "from-violet-500/25 to-cyan-500/25",
      };
    });

  return [...verified, ...extras].slice(0, limit);
}
