"use client";

import { motion } from "framer-motion";
import type { PortfolioArtifact } from "@/types";

const SKILL_COLORS: Record<string, string> = {
  HTML: "text-orange-300",
  CSS: "text-blue-300",
  JavaScript: "text-amber-300",
  "Responsive Design": "text-cyan-300",
  "UI Systems": "text-violet-300",
  DOM: "text-emerald-300",
  Logic: "text-fuchsia-300",
};

interface SkillConstellationProps {
  artifacts: PortfolioArtifact[];
}

export function SkillConstellation({ artifacts }: SkillConstellationProps) {
  const counts = new Map<string, number>();
  artifacts.forEach((a) => {
    a.skills.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  });
  const skills = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = skills[0]?.[1] ?? 1;

  return (
    <div className="ula-glass rounded-2xl p-5 border border-white/8">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">
        Skill constellation
      </p>
      <div className="space-y-3">
        {skills.map(([skill, count], i) => (
          <motion.div
            key={skill}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex justify-between text-xs mb-1">
              <span className={SKILL_COLORS[skill] ?? "text-zinc-300"}>{skill}</span>
              <span className="text-zinc-600 tabular-nums">{count}×</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400/80 to-violet-500/80"
                initial={{ width: 0 }}
                animate={{ width: `${(count / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
