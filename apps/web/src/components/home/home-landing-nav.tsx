"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function HomeLandingNav() {
  return (
    <header className="border-b border-white/6 bg-[#050508]/90 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/ibbul-logo.png" alt="IBBUL logo" className="h-8 w-auto object-contain" />
          <Logo size="sm" />
        </div>
        <Link
          href="/verified"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Verified artifacts
        </Link>
      </div>
    </header>
  );
}
