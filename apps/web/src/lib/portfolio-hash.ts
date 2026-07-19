import type { PortfolioArtifact } from "@/types";

/** Deterministic proof-of-work signature for portfolio artifacts */
export async function generatePortfolioHash(payload: {
  studentMatric: string;
  assignmentId: string;
  title: string;
  score: number | null;
  deployUrl?: string;
  timestamp: string;
}): Promise<string> {
  const raw = JSON.stringify({
    m: payload.studentMatric,
    a: payload.assignmentId,
    t: payload.title,
    s: payload.score,
    d: payload.deployUrl ?? "",
    ts: payload.timestamp,
  });

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }

  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h << 5) - h + raw.charCodeAt(i);
  return Math.abs(h).toString(16).padStart(16, "0").slice(0, 16);
}

export function formatProofHash(hash: string): string {
  return `ULA-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}-${hash.slice(8, 12).toUpperCase()}`;
}

export function artifactSkills(title: string, courseId: string): string[] {
  const base = ["HTML", "CSS", "JavaScript"];
  if (title.toLowerCase().includes("portfolio")) return [...base, "Responsive Design", "UI Systems"];
  if (title.toLowerCase().includes("calculator")) return [...base, "DOM", "Logic"];
  if (title.toLowerCase().includes("landing")) return [...base, "Animation", "Typography"];
  if (courseId.includes("Web")) return [...base, "Web Standards"];
  return base;
}
