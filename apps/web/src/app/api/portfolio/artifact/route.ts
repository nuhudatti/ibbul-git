import { NextResponse } from "next/server";
import type { PortfolioArtifact } from "@/types";
import { upsertServerArtifact } from "@/lib/services/portfolio-service";

export async function POST(req: Request) {
  try {
    const artifact = (await req.json()) as PortfolioArtifact;
    if (!artifact?.id || !artifact.studentMatric || !artifact.hash) {
      return NextResponse.json({ error: "Invalid artifact" }, { status: 400 });
    }
    await upsertServerArtifact(artifact);
    return NextResponse.json({ ok: true, id: artifact.id });
  } catch {
    return NextResponse.json({ error: "Failed to save artifact" }, { status: 500 });
  }
}
