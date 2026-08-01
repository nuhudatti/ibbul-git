import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, getSession } from "@/lib/auth-session";
import { requireAdmin } from "@/lib/admin-auth";
import {
  addComment,
  addFeedback,
  addChecklistItem,
  approveReview,
  getReviewById,
  publishReview,
  rejectReview,
  requestChanges,
  resubmitRevision,
  startReview,
} from "@/lib/services/review-workflow-service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const review = await getReviewById(id);

    if (session.role === "LECTURER") {
      return NextResponse.json({ review });
    }

    if (review.studentMatric !== session.matric) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Failed to load review", error);
    return NextResponse.json({ error: "Failed to load review" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const action = body?.action as string | undefined;
    const token = getSessionTokenFromRequest(req);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (action === "comment") {
      if (session.role !== "LECTURER") {
        return NextResponse.json({ error: "Lecturer access required" }, { status: 403 });
      }
      const comment = await addComment({
        reviewId: id,
        authorMatric: session.matric,
        authorRole: session.role,
        message: body.message,
        isInternal: body.isInternal ?? false,
      });
      return NextResponse.json({ comment });
    }

    if (action === "feedback") {
      if (session.role !== "LECTURER") {
        return NextResponse.json({ error: "Lecturer access required" }, { status: 403 });
      }
      const feedback = await addFeedback({
        reviewId: id,
        authorMatric: session.matric,
        authorRole: session.role,
        message: body.message,
        feedbackType: body.feedbackType,
        filePath: body.filePath,
        priority: body.priority,
        status: body.status,
        isInternal: body.isInternal ?? false,
      });
      return NextResponse.json({ feedback });
    }

    if (action === "checklist") {
      if (session.role !== "LECTURER") {
        return NextResponse.json({ error: "Lecturer access required" }, { status: 403 });
      }
      const item = await addChecklistItem(id, body.title, body.notes, body.checked ?? false);
      return NextResponse.json({ checklistItem: item });
    }

    if (action === "resubmit") {
      if (session.role !== "STUDENT") {
        return NextResponse.json({ error: "Student access required" }, { status: 403 });
      }
      const revision = await resubmitRevision({
        reviewId: id,
        studentMatric: session.matric,
        summary: body.summary,
        files: body.files,
      });
      return NextResponse.json({ revision });
    }

    if (session.role !== "LECTURER") {
      return NextResponse.json({ error: "Lecturer access required" }, { status: 403 });
    }

    if (action === "start-review") {
      const review = await startReview(id);
      return NextResponse.json({ review });
    }

    if (action === "request-changes") {
      const review = await requestChanges({
        reviewId: id,
        actorMatric: session.matric,
        actorRole: session.role,
        message: body.message,
        note: body.note,
      });
      return NextResponse.json({ review });
    }

    if (action === "approve") {
      const review = await approveReview({
        reviewId: id,
        actorMatric: session.matric,
        actorRole: session.role,
        message: body.message,
        note: body.note,
      });
      return NextResponse.json({ review });
    }

    if (action === "reject") {
      const review = await rejectReview({
        reviewId: id,
        actorMatric: session.matric,
        actorRole: session.role,
        message: body.message,
        note: body.note,
      });
      return NextResponse.json({ review });
    }

    if (action === "publish") {
      const review = await publishReview(id, body.note);
      return NextResponse.json({ review });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to process review action", error);
    return NextResponse.json({ error: "Failed to process review action" }, { status: 500 });
  }
}
