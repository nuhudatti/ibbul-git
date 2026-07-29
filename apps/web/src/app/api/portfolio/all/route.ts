import { NextResponse } from "next/server";
import { getAllArtifacts } from "@/lib/services/portfolio-service";

export async function GET() {
  const artifacts = await getAllArtifacts();
  return NextResponse.json({ artifacts });
}
