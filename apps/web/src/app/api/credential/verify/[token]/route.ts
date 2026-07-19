import { NextResponse } from "next/server";
import {
  buildArtifactBinding,
  collectSignatories,
  formatCredentialId,
  generateCredentialSeal,
  generatePlatformSignature,
  parseCredentialToken,
} from "@/lib/credential";
import {
  getArtifactsByMatric,
  seedDemoPortfolio,
} from "@/lib/portfolio-server-store";
import { resolveStudentProfile } from "@/lib/student-profile-server";
import { normalizeMatric } from "@/lib/matric";
import type { StudentPortfolioProfile } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  seedDemoPortfolio();
  const { token } = await params;
  const parsed = parseCredentialToken(token);

  if (!parsed) {
    return NextResponse.json(
      {
        valid: false,
        message: "Invalid credential token format.",
      },
      { status: 400 }
    );
  }

  const norm = normalizeMatric(parsed.matric);
  const artifacts = getArtifactsByMatric(norm);
  const expectedSeal = await generateCredentialSeal(norm, artifacts);
  const valid = expectedSeal === parsed.seal && artifacts.length > 0;

  const student = resolveStudentProfile(norm);
  const verified = artifacts.filter((a) => a.verified);
  const scores = artifacts.filter((a) => a.score != null).map((a) => a.score!);
  const latestVerified = verified
    .map((a) => a.verifiedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const issuedAt = latestVerified ?? artifacts[0]?.submittedAt ?? new Date().toISOString();
  const platformSignature = await generatePlatformSignature(norm, artifacts, issuedAt);

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
  };

  const signatories = collectSignatories(profile, artifacts, platformSignature);

  return NextResponse.json({
    valid,
    matric: norm,
    credentialId: formatCredentialId(parsed.seal),
    platformSignature,
    issuedAt,
    artifactBinding: buildArtifactBinding(artifacts),
    profile: valid ? profile : null,
    artifacts: valid ? artifacts : [],
    verifiedCount: verified.length,
    signatories: valid ? signatories : [],
    message: valid
      ? "Credential is authentic and issued by Project ULA. Artifact bindings match the platform registry."
      : artifacts.length === 0
        ? "No portfolio record found for this credential. It may be revoked or never issued."
        : "Credential seal mismatch. This document may be altered, expired, or not issued by Project ULA.",
  });
}
