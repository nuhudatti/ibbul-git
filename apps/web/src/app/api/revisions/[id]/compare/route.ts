import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, getSession } from "@/lib/auth-session";
import { prisma } from "@/lib/services/prisma";
import { compareRevision } from "@/lib/services/review-workflow-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionTokenFromRequest(request);
    const session = getSession(token);

    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const revision = await prisma.revision.findUniqueOrThrow({
      where: { id },
      include: {
        review: true,
      },
    });

    if (session.role !== "ADMIN" && revision.review.studentMatric !== session.matric) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comparison = await compareRevision(id);
    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("Failed to compare revision", error);
    return NextResponse.json({ error: "Failed to compare revision" }, { status: 500 });
  }
}
