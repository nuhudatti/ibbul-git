import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, getSession } from "@/lib/auth-session";
import { getReviewsForStudent, getNotifications } from "@/lib/services/review-workflow-service";

export async function GET(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session || session.role === "ADMIN") {
      return NextResponse.json({ error: "Student authentication required" }, { status: 401 });
    }

    const [reviews, notifications] = await Promise.all([
      getReviewsForStudent(session.matric),
      getNotifications(session.matric),
    ]);

    return NextResponse.json({ reviews, notifications });
  } catch (error) {
    console.error("Failed to load student review data", error);
    return NextResponse.json({ error: "Failed to load student review data" }, { status: 500 });
  }
}
