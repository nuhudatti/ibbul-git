import { NextResponse } from "next/server";

const AI_RESPONSES: Record<string, string> = {
  hint: "Here's a hint: break the problem into smaller steps. Start with the HTML structure, then style it, then add interactivity with JavaScript.",
  error: "I see a potential issue. Check your console for syntax errors — unclosed tags and missing semicolons are common culprits.",
  explain: "This code creates the foundation of your page. The HTML defines structure, CSS handles presentation, and JavaScript adds behavior.",
  default:
    "Great question! I can help you understand your code, debug errors, or give hints without giving away the full answer. Try asking: 'Explain my HTML structure' or 'Why isn't my button working?'",
};

export async function POST(request: Request) {
  const { message } = await request.json();
  const lower = (message as string).toLowerCase();

  let reply = AI_RESPONSES.default;
  if (lower.includes("hint")) reply = AI_RESPONSES.hint;
  else if (lower.includes("error") || lower.includes("bug") || lower.includes("fix"))
    reply = AI_RESPONSES.error;
  else if (lower.includes("explain") || lower.includes("what does"))
    reply = AI_RESPONSES.explain;

  await new Promise((r) => setTimeout(r, 600));

  return NextResponse.json({ reply });
}
