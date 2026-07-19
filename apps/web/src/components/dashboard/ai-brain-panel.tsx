"use client";

import { motion } from "framer-motion";
import { Brain, TrendingUp, AlertTriangle, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDENT_MATRIX } from "@/lib/mock-data";

/** Exactly four calm intelligence cards — no essay text */
const INSIGHTS = [
  {
    id: "engagement",
    icon: TrendingUp,
    label: "Engagement",
    value: "Portfolio assignment leading at 91%",
    tone: "cyan" as const,
  },
  {
    id: "risk",
    icon: AlertTriangle,
    label: "At risk",
    value: "3 students likely to miss Assignment 2 deadline",
    tone: "amber" as const,
  },
  {
    id: "top",
    icon: Trophy,
    label: "Top performer",
    value: "Chidi Okafor · 95% predicted · 92/100 graded",
    tone: "emerald" as const,
  },
  {
    id: "system",
    icon: Zap,
    label: "Learning gap",
    value: "CSS Flexbox · 72% struggle detected",
    tone: "violet" as const,
  },
];

const TONE = {
  cyan: "border-cyan-400/15 bg-cyan-400/[0.04] text-cyan-300/90",
  amber: "border-amber-400/15 bg-amber-400/[0.04] text-amber-300/90",
  emerald: "border-emerald-400/15 bg-emerald-400/[0.04] text-emerald-300/90",
  violet: "border-violet-400/15 bg-violet-400/[0.04] text-violet-300/90",
};

const ICON_TONE = {
  cyan: "text-cyan-400",
  amber: "text-amber-400",
  emerald: "text-emerald-400",
  violet: "text-violet-400",
};

export function AiBrainPanel() {
  const atRisk = STUDENT_MATRIX.filter((s) => s.risk !== "safe").slice(0, 4);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-400/15 flex items-center justify-center">
            <Brain size={17} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Education Brain</h2>
            <p className="text-[10px] text-zinc-600">Summarized · refreshes live</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 shrink-0">
        {INSIGHTS.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={cn("p-4 rounded-2xl border", TONE[item.tone])}
            >
              <div className="flex items-start gap-3">
                <Icon size={15} className={cn("shrink-0 mt-0.5", ICON_TONE[item.tone])} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm text-zinc-300 leading-snug">{item.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 flex-1 min-h-0 flex flex-col">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">
          Watch list
        </p>
        <div className="space-y-2 overflow-y-auto ula-scrollbar flex-1">
          {atRisk.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-300 truncate">{s.name}</p>
                <p className="text-[10px] text-zinc-600">{s.matric}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  s.risk === "critical"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-amber-500/10 text-amber-400"
                )}
              >
                {s.risk}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
