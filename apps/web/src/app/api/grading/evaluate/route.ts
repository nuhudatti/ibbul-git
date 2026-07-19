import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { projectId, files, rubric } = await request.json();

  await new Promise((r) => setTimeout(r, 1200));

  const htmlFile = files?.find((f: { path: string }) => f.path.endsWith(".html"));
  const cssFile = files?.find((f: { path: string }) => f.path.endsWith(".css"));
  const jsFile = files?.find((f: { path: string }) => f.path.endsWith(".js"));

  let score = 60;
  const feedback: string[] = [];
  const suggestions: string[] = [];

  if (htmlFile?.content?.includes("<!DOCTYPE html>")) {
    score += 10;
    feedback.push("Valid HTML document structure detected.");
  } else {
    suggestions.push("Add a proper DOCTYPE declaration to your HTML.");
  }

  if (cssFile?.content?.includes("flex") || cssFile?.content?.includes("grid")) {
    score += 10;
    feedback.push("Modern CSS layout techniques used.");
  } else {
    suggestions.push("Consider using flexbox or grid for layout.");
  }

  if (jsFile?.content?.includes("addEventListener")) {
    score += 10;
    feedback.push("Event handling implemented correctly.");
  }

  if (htmlFile?.content?.includes('lang="en"')) {
    score += 5;
    feedback.push("Accessibility: lang attribute present.");
  }

  score = Math.min(score, 100);

  return NextResponse.json({
    score,
    maxScore: rubric?.maxScore ?? 100,
    breakdown: {
      correctness: Math.min(score, 85),
      structure: 78,
      bestPractices: 72,
      uiQuality: cssFile ? 80 : 50,
      efficiency: jsFile ? 75 : 60,
    },
    feedback: feedback.join(" ") || "Submission received and analyzed.",
    suggestions:
      suggestions.length > 0
        ? suggestions
        : ["Great work! Consider adding more interactive features."],
    projectId,
  });
}
