"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { StudentMatrixEntry } from "@/types";

const RISK_STYLE = {
  safe: { ring: "ring-emerald-400/50", badge: "text-emerald-400 bg-emerald-400/10", label: "On track" },
  watch: { ring: "ring-amber-400/50", badge: "text-amber-400 bg-amber-400/10", label: "Watch" },
  critical: { ring: "ring-red-400/50 animate-pulse", badge: "text-red-400 bg-red-400/10", label: "At risk" },
};

const LIVE_STYLE = {
  typing: { color: "bg-cyan-400", label: "Coding now" },
  idle: { color: "bg-amber-400", label: "Idle" },
  submitted: { color: "bg-emerald-400", label: "Submitted" },
  offline: { color: "bg-zinc-600", label: "Offline" },
};

interface StudentMatrixCardProps {
  student: StudentMatrixEntry;
  index: number;
}

export function StudentMatrixCard({ student: s, index }: StudentMatrixCardProps) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_STYLE[s.risk];
  const live = LIVE_STYLE[s.liveStatus];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => setExpanded(!expanded)}
      className={cn(
        "relative p-4 rounded-2xl ula-glass cursor-pointer transition-all",
        "border border-white/6 hover:border-cyan-400/20",
        expanded && "col-span-2 row-span-2 border-cyan-400/30"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar + status ring */}
        <div className={cn("relative rounded-full p-0.5 ring-2", risk.ring)}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-500/20 flex items-center justify-center text-sm font-bold text-zinc-200">
            {s.avatar}
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0c0c12]",
              live.color,
              s.liveStatus === "typing" && "ula-pulse"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-200 truncate">{s.name}</p>
          <p className="text-[10px] text-zinc-600 font-mono">{s.matric}</p>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-white">{s.predictionScore}%</p>
          <p className="text-[10px] text-zinc-600">AI predict</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full", risk.badge)}>{risk.label}</span>
        <span className="text-[10px] text-zinc-600">{live.label}</span>
        <span className="text-[10px] text-zinc-600 ml-auto">{s.lastActive}</span>
      </div>

      {/* Progress arc */}
      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
          initial={{ width: 0 }}
          animate={{ width: `${s.assignmentProgress}%` }}
          transition={{ duration: 0.8, delay: index * 0.05 }}
        />
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/6"
          >
            <p className="text-xs text-zinc-500 mb-2">Activity timeline</p>
            <div className="space-y-1.5">
              {s.activityTimeline.map((item) => (
                <p key={item} className="text-xs text-zinc-400 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-cyan-400" />
                  {item}
                </p>
              ))}
            </div>
            {s.score !== null ? (
              <p className="mt-3 text-sm text-emerald-400 font-medium">Score: {s.score}/100</p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
