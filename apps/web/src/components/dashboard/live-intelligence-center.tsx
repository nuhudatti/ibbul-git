"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronDown, Users } from "lucide-react";
import { groupActivityEvents, formatRelativeShort } from "@/lib/live-intelligence";
import { cn } from "@/lib/utils";
import type { ActivityEvent, StudentMatrixEntry } from "@/types";
import { StudentRosterRow } from "./student-roster-row";

interface LiveIntelligenceCenterProps {
  events: ActivityEvent[];
  students: StudentMatrixEntry[];
}

const TYPE_DOT = {
  deploy: "bg-violet-400",
  submit: "bg-emerald-400",
  start: "bg-cyan-400",
  ai_help: "bg-blue-400",
  grade: "bg-amber-400",
  error: "bg-red-400",
  idle: "bg-zinc-500",
};

export function LiveIntelligenceCenter({ events, students }: LiveIntelligenceCenterProps) {
  const [showRoster, setShowRoster] = useState(false);
  const grouped = useMemo(() => groupActivityEvents(events), [events]);

  const liveCount = students.filter((s) => s.liveStatus === "typing" || s.liveStatus === "idle").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-5 py-4 border-b border-white/6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity size={15} className="text-cyan-400" />
              Live intelligence
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              {liveCount} students active · {grouped.length} signals (grouped)
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ula-pulse" />
            Calm stream
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ula-scrollbar px-5 py-4 min-h-0">
        <div className="space-y-1">
          {grouped.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
              className={cn(
                "flex items-start gap-3 py-3 px-3 rounded-xl transition-colors",
                i === 0 && item.isLive ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"
              )}
            >
              <div className="relative shrink-0 mt-1.5">
                <span className={cn("block w-2 h-2 rounded-full", TYPE_DOT[item.type])} />
                {item.isLive && i === 0 ? (
                  <span className="absolute inset-0 rounded-full bg-emerald-400/40 ula-pulse scale-150" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    item.severity === "alert"
                      ? "text-amber-200/90"
                      : item.severity === "success"
                        ? "text-zinc-300"
                        : "text-zinc-400"
                  )}
                >
                  {item.line}
                </p>
              </div>
              <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 pt-0.5">
                {formatRelativeShort(item.timestamp)}
              </span>
            </motion.div>
          ))}
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-12">Class is quiet — no live signals.</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/6">
        <button
          type="button"
          onClick={() => setShowRoster((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
            <Users size={14} className="text-violet-400/80" />
            Student roster
            <span className="text-zinc-600">({students.length})</span>
          </span>
          <ChevronDown
            size={16}
            className={cn("text-zinc-500 transition-transform", showRoster && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {showRoster ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-1 max-h-[240px] overflow-y-auto ula-scrollbar">
                {students.map((s) => (
                  <StudentRosterRow key={s.id} student={s} />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
