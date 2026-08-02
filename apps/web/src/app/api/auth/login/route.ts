import { NextResponse } from "next/server";
import { authenticateStudent } from "@/lib/services/student-profile-service";
import { createSession, sessionCookieHeader } from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    console.log("[AuthLogin] POST /api/auth/login start");
    const body = await req.json();
    console.log("[AuthLogin] request body", body);
    const { matricNumber, password } = body;
    if (!matricNumber?.trim() || !password) {
      return NextResponse.json({ error: "Matric and password required" }, { status: 400 });
    }
    const user = await authenticateStudent(matricNumber, password);
    console.log("[AuthLogin] authenticateStudent result", { user: !!user });
    if (!user) {
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
  } catch (error) {
    console.error("[AuthLogin] error", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
