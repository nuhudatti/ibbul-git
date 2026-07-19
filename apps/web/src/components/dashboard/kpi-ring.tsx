"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface KpiRingProps {
  value: number;
  max?: number;
  label: string;
  sublabel: string;
  color?: "cyan" | "violet" | "emerald" | "amber";
  size?: number;
}

const COLORS = {
  cyan: { stroke: "#00e5ff", glow: "rgba(0,229,255,0.3)" },
  violet: { stroke: "#7c3aed", glow: "rgba(124,58,237,0.3)" },
  emerald: { stroke: "#22c55e", glow: "rgba(34,197,94,0.3)" },
  amber: { stroke: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
};

export function KpiRing({
  value,
  max = 100,
  label,
  sublabel,
  color = "cyan",
  size = 120,
}: KpiRingProps) {
  const pct = Math.min((value / max) * 100, 100);
  const motionPct = useMotionValue(0);
  const strokeDashoffset = useTransform(motionPct, (v) => {
    const circumference = 2 * Math.PI * 42;
    return circumference - (v / 100) * circumference;
  });

  useEffect(() => {
    animate(motionPct, pct, { duration: 1.2, ease: "easeOut" });
  }, [pct, motionPct]);

  const c = COLORS[color];
  const r = 42;
  const circumference = 2 * Math.PI * r;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40"
          style={{ background: c.glow }}
        />
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={6}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={c.stroke}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white"
          >
            {value}
            {max === 100 ? "%" : ""}
          </motion.span>
        </div>
      </div>
      <p className="text-xs font-medium text-zinc-300 mt-2 text-center">{label}</p>
      <p className="text-[10px] text-zinc-600 text-center">{sublabel}</p>
    </motion.div>
  );
}

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ value, suffix = "", className }: AnimatedCounterProps) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    animate(motionVal, value, { duration: 1, ease: "easeOut" });
  }, [value, motionVal]);

  return (
    <motion.span className={cn("tabular-nums", className)}>
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}
