"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentMatrixEntry } from "@/types";

const RISK = {
  safe: "text-emerald-400/90",
  watch: "text-amber-400/90",
  critical: "text-red-400/90",
};

export function StudentRosterRow({ student: s }: { student: StudentMatrixEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-transparent hover:border-white/6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 py-2.5 px-2 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
          {s.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300 truncate">{s.name}</p>
          <p className="text-[10px] text-zinc-600 font-mono">{s.matric}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-zinc-200 tabular-nums">{s.predictionScore}%</p>
          <p className={cn("text-[10px] capitalize", RISK[s.risk])}>{s.risk}</p>
        </div>
        <ChevronRight
          size={14}
          className={cn("text-zinc-600 transition-transform shrink-0", open && "rotate-90")}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-2 pb-2 overflow-hidden"
          >
            <div className="pl-11 pr-2 py-2 space-y-1 border-t border-white/5">
              <p className="text-[10px] text-zinc-600">
                {s.liveStatus === "typing" ? "Coding now" : s.liveStatus} · {s.lastActive}
              </p>
              {s.score != null ? (
                <p className="text-xs text-emerald-400">Score {s.score}/100</p>
              ) : (
                <p className="text-xs text-zinc-500">Progress {s.assignmentProgress}%</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
