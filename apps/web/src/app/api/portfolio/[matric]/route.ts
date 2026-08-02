import { NextResponse } from "next/server";
import { normalizeMatric } from "@/lib/matric";
import {
  getArtifactsByMatric,
  getGlobalFeed,
  seedDemoPortfolio,
} from "@/lib/services/portfolio-service";
import { getProfileRecordByMatric, getResolvedProfileRecord } from "@/lib/services/student-profile-service";
import type { StudentPortfolioProfile } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  await seedDemoPortfolio();
  const { matric } = await params;
  const norm = normalizeMatric(matric);
  const student = await getResolvedProfileRecord(norm);
  const record = await getProfileRecordByMatric(norm);
  const artifacts = await getArtifactsByMatric(norm);

  const verified = artifacts.filter((a) => a.verified);
  const scores = artifacts.filter((a) => a.score != null).map((a) => a.score!);
  const profile: StudentPortfolioProfile = {
    matric: norm,
    displayName: student?.displayName ?? norm,
    avatar: student?.avatar ?? norm.slice(0, 2),
    avatarUrl: student?.avatarUrl,
    institution: "Project ULA · Federal University of Technology",
    program: student?.program ?? "ULA Scholar",
    joinedAt: "2024-09-01",
    headline: student?.headline ?? "Verified builder · Live deployable work",
    verifiedCount: verified.length,
    totalArtifacts: artifacts.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    liveDeploys: artifacts.filter((a) => a.deployUrl).length,
    updatedAt: record?.updatedAt ? record.updatedAt.toISOString() : new Date().toISOString(),
  };

  return NextResponse.json({
    profile,
    artifacts,
    feed: await getGlobalFeed(12),
  });
}
