"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Assignment, EngagementHeat } from "@/types";

const HEAT_GLOW: Record<EngagementHeat, string> = {
  high: "shadow-emerald-500/20 border-emerald-500/30",
  medium: "shadow-amber-500/15 border-amber-500/25",
  low: "shadow-red-500/15 border-red-500/25",
};

const HEAT_LABEL: Record<EngagementHeat, string> = {
  high: "High engagement",
  medium: "Moderate",
  low: "Needs attention",
};

interface AssignmentStreamCardProps {
  assignment: Assignment;
  index: number;
  onPublish?: (id: string) => void;
}

export function AssignmentStreamCard({ assignment: a, index, onPublish }: AssignmentStreamCardProps) {
  const progress = a.enrolled > 0 ? (a.submitted / a.enrolled) * 100 : 0;

  const engagement = (a.engagement ?? "medium") as EngagementHeat;
  const heatClass = HEAT_GLOW[engagement] ?? HEAT_GLOW.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className={cn(
        "relative p-4 rounded-2xl ula-glass overflow-hidden cursor-pointer",
        "border transition-all duration-300",
        a.status === "PUBLISHED" ? heatClass : "border-white/6 opacity-60"
      )}
    >
      {/* Wave progress background */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400/40 via-violet-500/40 to-cyan-400/40"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        style={{ transformOrigin: "left" }}
        transition={{ duration: 1, delay: index * 0.1 }}
      />

      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-zinc-100">{a.title}</h3>
            {a.status === "DRAFT" ? (
              <button
                onClick={() => onPublish?.(a.id)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
              >
                Publish
              </button>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500 line-clamp-1">{a.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-white">{Math.round(progress)}%</p>
          <p className="text-[10px] text-zinc-600">submitted</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px]">
        <span className="text-zinc-600">{a.submitted}/{a.enrolled} students</span>
        <span className="text-zinc-600">Due {a.deadline}</span>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full capitalize",
            a.engagement === "high" && "text-emerald-400 bg-emerald-400/10",
            a.engagement === "medium" && "text-amber-400 bg-amber-400/10",
            a.engagement === "low" && "text-red-400 bg-red-400/10"
          )}
        >
          {HEAT_LABEL[(a.engagement ?? "medium") as EngagementHeat]}
        </span>
      </div>

      {/* Animated wave bars */}
      <div className="flex items-end gap-0.5 h-6 mt-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-cyan-400/30 to-violet-500/50"
            animate={{ height: [`${20 + Math.random() * 60}%`, `${30 + Math.random() * 70}%`] }}
            transition={{ duration: 1.5 + Math.random(), repeat: Infinity, repeatType: "reverse" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
