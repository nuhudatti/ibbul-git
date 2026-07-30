import { NextResponse } from "next/server";
import { getGlobalFeed, seedDemoPortfolio } from "@/lib/services/portfolio-service";

export async function GET() {
  await seedDemoPortfolio();
  const events = await getGlobalFeed(40);
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
