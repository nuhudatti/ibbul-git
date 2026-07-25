import { NextResponse } from "next/server";
import { authenticateStudent } from "@/lib/services/student-profile-service";
import { createSession, sessionCookieHeader } from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    const { matricNumber, password } = await req.json();
    if (!matricNumber?.trim() || !password) {
      return NextResponse.json({ error: "Matric and password required" }, { status: 400 });
    }

    console.info("[Login] attempt", { matricNumber });
    const user = await authenticateStudent(matricNumber, password);
    if (!user) {
      console.warn("[Login] failed", { matricNumber });
      return NextResponse.json({ error: "Invalid matric number or password" }, { status: 401 });
    }

    const sessionToken = createSession(user.matricNumber, user.role);

    const res = NextResponse.json({
      user,
      sessionToken,
      mustChangePassword: user.mustChangePassword ?? false,
    });
    res.headers.set("Set-Cookie", sessionCookieHeader(sessionToken));
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
