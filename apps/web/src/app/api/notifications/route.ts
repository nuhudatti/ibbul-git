import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, getSession } from "@/lib/auth-session";
import { getNotifications, markNotificationsRead } from "@/lib/services/review-workflow-service";

export async function GET(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const notifications = await getNotifications(session.matric);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to load notifications", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await markNotificationsRead(session.matric);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark notifications read", error);
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
