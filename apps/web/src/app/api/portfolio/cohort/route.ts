import { NextResponse } from "next/server";
import { buildCohortRegistry, getCohortFeed, getHeroArtifacts } from "@/lib/cohort-registry";

export async function GET() {
  const { builders, stats } = await buildCohortRegistry();
  const feed = await getCohortFeed();
  const heroArtifacts = await getHeroArtifacts(8);

  return NextResponse.json({
    builders,
    stats,
    feed,
    heroArtifacts,
    updatedAt: new Date().toISOString(),
  });
}
