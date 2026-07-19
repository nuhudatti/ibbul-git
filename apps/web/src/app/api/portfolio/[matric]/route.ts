import { NextResponse } from "next/server";
import {
  getArtifactsByMatric,
  getGlobalFeed,
  seedDemoPortfolio,
} from "@/lib/portfolio-server-store";
import {
  getProfileRecord,
  resolveStudentProfile,
} from "@/lib/student-profile-server";
import { normalizeMatric } from "@/lib/matric";
import type { StudentPortfolioProfile } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  seedDemoPortfolio();
  const { matric } = await params;
  const norm = normalizeMatric(matric);
  const student = resolveStudentProfile(norm);
  const record = getProfileRecord(norm);
  const artifacts = getArtifactsByMatric(norm);

  const verified = artifacts.filter((a) => a.verified);
  const scores = artifacts.filter((a) => a.score != null).map((a) => a.score!);
  const profile: StudentPortfolioProfile = {
    matric: norm,
    displayName: student.displayName,
    avatar: student.avatar,
    avatarUrl: student.avatarUrl,
    institution: "Project ULA · Federal University of Technology",
    program: student.program,
    joinedAt: "2024-09-01",
    headline: student.headline,
    verifiedCount: verified.length,
    totalArtifacts: artifacts.length,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    liveDeploys: artifacts.filter((a) => a.deployUrl).length,
    updatedAt: record?.updatedAt,
  };

  return NextResponse.json({
    profile,
    artifacts,
    feed: getGlobalFeed(12),
  });
}
