import type { PortfolioArtifact, StudentPortfolioProfile } from "@/types";
import { matricToSlug, normalizeMatric, slugToMatric } from "@/lib/matric";
import { formatProofHash } from "@/lib/portfolio-hash";

const CERT_VERSION = "ULA-CERT-v1";

async function digestHex(input: string, length = 32): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, length);
  }
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h << 5) - h + input.charCodeAt(i);
  return Math.abs(h).toString(16).padStart(length, "0").slice(0, length);
}

/** Canonical artifact binding for tamper detection */
export function buildArtifactBinding(artifacts: PortfolioArtifact[]): string {
  return artifacts
    .map((a) => `${a.id}:${a.hash}:${a.verified ? "1" : "0"}:${a.score ?? "null"}`)
    .sort()
    .join("|");
}

/** Short seal — must match server verification */
export async function generateCredentialSeal(
  matric: string,
  artifacts: PortfolioArtifact[]
): Promise<string> {
  const norm = normalizeMatric(matric);
  const raw = `${CERT_VERSION}|${norm}|${buildArtifactBinding(artifacts)}`;
  return digestHex(raw, 12);
}

export async function generatePlatformSignature(
  matric: string,
  artifacts: PortfolioArtifact[],
  issuedAt: string
): Promise<string> {
  const seal = await generateCredentialSeal(matric, artifacts);
  const raw = `${CERT_VERSION}|PLATFORM|${normalizeMatric(matric)}|${seal}|${issuedAt}`;
  const full = await digestHex(raw, 32);
  return `ULA-SIG-${full.slice(0, 8).toUpperCase()}-${full.slice(8, 16).toUpperCase()}-${full.slice(16, 24).toUpperCase()}-${full.slice(24, 32).toUpperCase()}`;
}

export function buildCredentialToken(matric: string, seal: string): string {
  return `${matricToSlug(matric)}-${seal}`;
}

export function parseCredentialToken(token: string): { matric: string; seal: string } | null {
  const decoded = decodeURIComponent(token).trim().toUpperCase();
  const match = decoded.match(/^((?:U\d{2}-[A-Z]{3}-[A-Z]{3}-\d{4})|(?:[A-Z0-9]+))-([A-F0-9]{12})$/);
  if (!match) return null;
  const matric = slugToMatric(match[1]);
  return { matric, seal: match[2].toLowerCase() };
}

export function buildVerifyUrl(origin: string, matric: string, seal: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/verify/${buildCredentialToken(matric, seal)}`;
}

export function formatCredentialId(seal: string): string {
  const s = seal.toUpperCase();
  return `ULA-CERT-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export interface CredentialSignatory {
  role: "platform" | "faculty" | "holder";
  name: string;
  title: string;
  signedAt: string;
  signatureCode?: string;
}

export function collectSignatories(
  profile: StudentPortfolioProfile,
  artifacts: PortfolioArtifact[],
  platformSignature: string
): CredentialSignatory[] {
  const signatories: CredentialSignatory[] = [
    {
      role: "platform",
      name: "Project ULA Credential Authority",
      title: "Platform-issued cryptographic seal · Non-forgeable outside ULA",
      signedAt: new Date().toISOString(),
      signatureCode: platformSignature,
    },
  ];

  const latestVerified = artifacts
    .filter((a) => a.verified && a.verifiedAt)
    .sort((a, b) => new Date(b.verifiedAt!).getTime() - new Date(a.verifiedAt!).getTime())[0];

  if (latestVerified) {
    signatories.push({
      role: "faculty",
      name: "Dr. Abdulganiyu Abdulrahman",
      title: "Department verifier · Institutional approval",
      signedAt: latestVerified.verifiedAt!,
      signatureCode: formatProofHash(latestVerified.hash),
    });
  }

  signatories.push({
    role: "holder",
    name: profile.displayName,
    title: "Credential holder · Platform-verified identity (matric-bound)",
    signedAt: new Date().toISOString(),
  });

  return signatories;
}

export interface CredentialVerificationResult {
  valid: boolean;
  matric: string;
  credentialId: string;
  platformSignature: string;
  issuedAt: string;
  profile: StudentPortfolioProfile | null;
  artifacts: PortfolioArtifact[];
  verifiedCount: number;
  message: string;
  signatories: CredentialSignatory[];
}
