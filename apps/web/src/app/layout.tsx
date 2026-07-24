import type { Metadata } from "next";
import { ensureBootstrapAccounts } from "@/lib/services/student-profile-service";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project ULA — Unified Learning Architecture",
  description:
    "The AI-powered development operating system for learning, coding, grading, and deployment.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureBootstrapAccounts();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
