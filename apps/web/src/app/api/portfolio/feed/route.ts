import { NextResponse } from "next/server";
import { getGlobalFeed, seedDemoPortfolio } from "@/lib/services/portfolio-service";
import { ensureBootstrapAccounts } from "@/lib/services/student-profile-service";

export async function GET() {
  // Only run demo seeding when explicitly enabled (not in production by default)
  try {
    if (process.env.ENABLE_DEMO_SEED === "true" && process.env.NODE_ENV !== "production") {
      await seedDemoPortfolio();
    }

    // Ensure default platform accounts exist on first startup and remain idempotent.
    try {
      await ensureBootstrapAccounts();
    } catch (err) {
      // don't block the feed on bootstrap failures
      console.warn("Bootstrap account check failed:", err);
    }

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
  } catch (err: any) {
    // Harden the endpoint: log and return an empty feed instead of 500
    console.error("/api/portfolio/feed error:", err);
    return NextResponse.json({
      feed: [],
      updatedAt: new Date().toISOString(),
      stats: { total: 0, verifyCount: 0, deployCount: 0, submitCount: 0 },
      error: "Feed unavailable",
    });
  }
}
