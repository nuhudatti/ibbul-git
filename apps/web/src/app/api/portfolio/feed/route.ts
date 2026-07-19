import { NextResponse } from "next/server";
import {
  getGlobalFeed,
  seedDemoPortfolio,
  seedNetworkPulseFeed,
} from "@/lib/portfolio-server-store";

export async function GET() {
  seedDemoPortfolio();
  seedNetworkPulseFeed();
  const events = getGlobalFeed(40);
  const verifyCount = events.filter((e) => e.type === "verify").length;
  const deployCount = events.filter((e) => e.type === "deploy").length;
  const submitCount = events.filter((e) => e.type === "submit").length;

  return NextResponse.json({
    feed: events,
    updatedAt: new Date().toISOString(),
    stats: {
      total: events.length,
      verifyCount,
      deployCount,
      submitCount,
    },
  });
}
