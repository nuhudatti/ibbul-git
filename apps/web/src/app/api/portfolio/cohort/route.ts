import { NextResponse } from "next/server";
import {
  buildCohortRegistry,
  getCohortFeed,
  getHeroArtifacts,
} from "@/lib/cohort-registry";
import { seedNetworkPulseFeed } from "@/lib/portfolio-server-store";

export async function GET() {
  seedNetworkPulseFeed();
  const { builders, stats } = buildCohortRegistry();
  const feed = getCohortFeed();
  const heroArtifacts = getHeroArtifacts(8);

  return NextResponse.json({
    builders,
    stats,
    feed,
    heroArtifacts,
    updatedAt: new Date().toISOString(),
  });
}
