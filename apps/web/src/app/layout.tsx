import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project ULA — Unified Learning Architecture",
  description:
    "The AI-powered development operating system for learning, coding, grading, and deployment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
