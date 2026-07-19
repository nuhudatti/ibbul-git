"use client";

import { useRouter } from "next/navigation";
import { LogOut, Radio } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

interface MissionHeaderProps {
  engagement: number;
  online: number;
  total: number;
  avgScore: number;
  atRisk: number;
}

export function MissionHeader({
  engagement,
  online,
  total,
  avgScore,
  atRisk,
}: MissionHeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const stats = [
    { label: "Engagement", value: `${engagement}%` },
    { label: "Online", value: `${online}/${total}` },
    { label: "Performance", value: `${avgScore}%` },
    { label: "At risk", value: String(atRisk), alert: atRisk > 0 },
  ];

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-white/6 bg-[#050508]/90 backdrop-blur-xl">
      <div className="flex items-center gap-5 min-w-0">
        <Logo size="sm" showText={false} />
        <div className="hidden sm:block min-w-0">
          <p className="text-sm font-medium text-white leading-none">Mission Control</p>
          <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5">
            <Radio size={10} className="text-emerald-400 ula-pulse" />
            Live class intelligence
          </p>
        </div>
        <div className="hidden md:flex items-center gap-6 pl-4 border-l border-white/6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  s.alert ? "text-amber-400" : "text-zinc-200"
                }`}
              >
                {s.value}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <span className="text-xs text-zinc-500 hidden lg:inline">
            {user.firstName} {user.lastName}
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}
