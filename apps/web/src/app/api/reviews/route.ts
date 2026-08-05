import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";
import { getSessionTokenFromRequest, getSession } from "@/lib/auth-session";
import {
  createReview,
  getAllReviews,
  getReviewsForStudent,
  getNotifications,
  markNotificationsRead,
} from "@/lib/services/review-workflow-service";

export async function POST(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role !== "LECTURER") {
      return NextResponse.json({ error: "Lecturer access required" }, { status: 403 });
    }

    const body = await req.json();
    const { studentMatric, assignmentId, projectSnapshotId, title, summary, reviewerMatric, reviewerName, checklist } = body as {
      studentMatric: string;
      assignmentId: string;
      projectSnapshotId?: string;
      title: string;
      summary?: string;
      reviewerMatric?: string;
      reviewerName?: string;
      checklist?: Array<{ title: string; notes?: string; checked?: boolean }>;
    };

    if (!studentMatric || !assignmentId || !title) {
      return NextResponse.json({ error: "studentMatric, assignmentId, and title are required" }, { status: 400 });
    }

    const projectSnapshotIdFromLatest = projectSnapshotId ?? (
      await prisma.projectSnapshot.findFirst({
        where: { studentMatric, assignmentId },
        orderBy: { savedAt: "desc" },
        select: { id: true },
      })
    )?.id ?? null;

    const review = await createReview({
      studentMatric,
      assignmentId,
      projectSnapshotId: projectSnapshotIdFromLatest,
      title,
      summary,
      reviewerMatric,
      reviewerName,
      checklist,
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Failed to create review", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin cannot review student projects. Use the platform management tools instead." },
        { status: 403 }
      );
    }

    if (session.role === "LECTURER") {
      const reviews = await getAllReviews();
      return NextResponse.json({ reviews });
    }

    const reviews = await getReviewsForStudent(session.matric);
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Failed to load reviews", error);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { action, reviewId, message, note, isInternal } = body as {
      action?: "mark-read";
      reviewId?: string;
      message?: string;
      note?: string;
      isInternal?: boolean;
    };

    if (action === "mark-read") {
      await markNotificationsRead(session.matric);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update review notifications", error);
    return NextResponse.json({ error: "Failed to update review notifications" }, { status: 500 });
  }
}
