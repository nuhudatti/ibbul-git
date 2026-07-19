"use client";

import { motion } from "framer-motion";
import { Brain, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiInsight } from "@/types";

const SEVERITY = {
  critical: { border: "border-red-500/30", icon: "text-red-400", bg: "from-red-500/10" },
  warning: { border: "border-amber-500/30", icon: "text-amber-400", bg: "from-amber-500/10" },
  info: { border: "border-cyan-500/30", icon: "text-cyan-400", bg: "from-cyan-500/10" },
  success: { border: "border-emerald-500/30", icon: "text-emerald-400", bg: "from-emerald-500/10" },
};

interface AiEnginePanelProps {
  insights: AiInsight[];
}

export function AiEnginePanel({ insights }: AiEnginePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="p-2 rounded-xl bg-violet-500/20">
          <Brain size={18} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Education Brain</h2>
          <p className="text-[10px] text-zinc-600 flex items-center gap-1">
            <Zap size={10} className="text-amber-400 ula-pulse" />
            Thinking live
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto ula-scrollbar pr-1">
        {insights.map((insight, i) => {
          const sev = SEVERITY[insight.severity];
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ x: -4 }}
              className={cn(
                "p-4 rounded-xl border bg-gradient-to-br to-transparent",
                sev.border,
                sev.bg
              )}
            >
              <div className="flex items-start gap-2">
                <Brain size={14} className={cn("mt-0.5 shrink-0", sev.icon)} />
                <div>
                  <h3 className="text-sm font-medium text-zinc-200">{insight.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{insight.detail}</p>
                  {insight.action ? (
                    <button className="flex items-center gap-1 text-[11px] text-cyan-400 mt-2 hover:text-cyan-300 transition-colors">
                      {insight.action}
                      <ChevronRight size={12} />
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
