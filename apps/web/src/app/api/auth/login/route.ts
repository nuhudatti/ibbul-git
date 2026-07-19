import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/student-profile-server";
import { createSession, sessionCookieHeader } from "@/lib/auth-session";

export async function POST(req: Request) {
  try {
    const { matricNumber, password } = await req.json();
    if (!matricNumber?.trim() || !password) {
      return NextResponse.json({ error: "Matric and password required" }, { status: 400 });
    }

    const user = authenticateUser(matricNumber, password);
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
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
