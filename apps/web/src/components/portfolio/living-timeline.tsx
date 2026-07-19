"use client";

import { motion } from "framer-motion";
import type { PortfolioArtifact } from "@/types";
import { ArtifactCard } from "./artifact-card";

interface LivingTimelineProps {
  artifacts: PortfolioArtifact[];
  publicView?: boolean;
  baseUrl?: string;
}

export function LivingTimeline({ artifacts, publicView, baseUrl }: LivingTimelineProps) {
  if (artifacts.length === 0) {
    return (
      <div className="text-center py-20 px-6 rounded-2xl border border-dashed border-white/10">
        <p className="text-zinc-500 text-sm">No verified work yet.</p>
        <p className="text-zinc-600 text-xs mt-2">
          Complete an assignment in the IDE — your portfolio builds automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-cyan-400/40 via-violet-500/30 to-transparent" />

      <div className="space-y-6">
        {artifacts.map((artifact, i) => (
          <motion.div
            key={artifact.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="relative pl-10"
          >
            <div
              className={`absolute left-0 top-6 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center ${
                artifact.verified
                  ? "border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20"
                  : "border-cyan-400/50 bg-cyan-400/10"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${artifact.verified ? "bg-emerald-400 ula-pulse" : "bg-cyan-400"}`}
              />
            </div>
            <ArtifactCard
              artifact={artifact}
              expanded={i === 0}
              publicView={publicView}
              baseUrl={baseUrl}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
