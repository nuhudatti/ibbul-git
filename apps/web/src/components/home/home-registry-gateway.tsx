"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  Radio,
  ShieldCheck,
} from "lucide-react";
import type { CohortStats } from "@/lib/cohort-registry";
import type { PortfolioArtifact } from "@/types";
import { formatProofHash } from "@/lib/portfolio-hash";
import { cn } from "@/lib/utils";

export function HomeRegistryGateway() {
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [artifacts, setArtifacts] = useState<PortfolioArtifact[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio/cohort")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        setArtifacts((d.heroArtifacts ?? []).filter((a: PortfolioArtifact) => a.verified).slice(0, 5));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (artifacts.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % artifacts.length), 3500);
    return () => clearInterval(t);
  }, [artifacts.length, paused]);

  const active = artifacts[index] ?? artifacts[0];

  return (
    <div
      className="flex flex-col h-full rounded-2xl border border-emerald-400/15 bg-gradient-to-b from-emerald-500/[0.08] to-black/40 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/25">
            <BadgeCheck size={22} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/80">
            <Radio size={10} className="ula-pulse" />
            Live
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white tracking-tight">Verified artifacts</h2>
        <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
          Lecturer-sealed proof-of-work — public, hashed, and deployable.
        </p>

        {stats ? (
          <div className="flex gap-4 mt-4 text-sm tabular-nums">
            <span>
              <strong className="text-white font-semibold">{stats.verifiedArtifacts}</strong>
              <span className="text-zinc-600 ml-1">verified</span>
            </span>
            <span>
              <strong className="text-white font-semibold">{stats.totalBuilders}</strong>
              <span className="text-zinc-600 ml-1">builders</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* Interactive draggable preview */}
      <div className="relative mx-4 mb-4 rounded-xl border border-white/8 bg-black/30 min-h-[168px] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-black tracking-[0.25em] text-white/[0.03]"
          aria-hidden
        >
          ULA
        </div>

        {artifacts.length === 0 ? (
          <div className="flex items-center justify-center h-[168px] text-xs text-zinc-600 ula-shimmer">
            Loading artifacts…
          </div>
        ) : (
          <div className="relative h-[168px] p-3">
            <div className="absolute left-3 top-3 bottom-3 flex flex-col justify-center gap-1.5 z-0">
              {artifacts.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "text-left px-2.5 py-1.5 rounded-lg border transition-all max-w-[120px]",
                    i === index
                      ? "border-emerald-400/40 bg-emerald-500/15 opacity-100"
                      : "border-transparent bg-white/5 opacity-50 hover:opacity-80"
                  )}
                >
                  <p className="text-[9px] font-semibold text-white truncate">{a.title}</p>
                </button>
              ))}
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[58%] max-w-[200px]">
              <AnimatePresence mode="wait">
                {active ? (
                  <motion.div
                    key={active.id}
                    drag
                    dragConstraints={{ left: -12, right: 12, top: -12, bottom: 12 }}
                    dragElastic={0.2}
                    initial={{ opacity: 0, x: 12, rotate: 2 }}
                    animate={{ opacity: 1, x: 0, rotate: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.28 }}
                    className="cursor-grab active:cursor-grabbing rounded-xl border border-emerald-400/35 bg-emerald-500/10 backdrop-blur-md p-3 shadow-[0_8px_32px_rgba(16,185,129,0.15)]"
                  >
                    <div className="flex items-center gap-1 text-emerald-400 mb-1.5">
                      <ShieldCheck size={11} />
                      <span className="text-[8px] font-bold uppercase tracking-wide">Verified</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-tight line-clamp-2">
                      {active.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1 truncate">{active.studentName}</p>
                    <p className="text-[8px] font-mono text-cyan-400/80 mt-2 flex items-center gap-1">
                      <Fingerprint size={8} />
                      {formatProofHash(active.hash)}
                    </p>
                    {active.score != null ? (
                      <p className="text-sm font-bold text-emerald-300 mt-1.5 tabular-nums">
                        {active.score}%
                      </p>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 mt-auto">
        <Link
          href="/verified"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-emerald-600/90 hover:bg-emerald-500 transition-colors shadow-[0_4px_24px_rgba(16,185,129,0.25)]"
        >
          Open artifact registry
          <ArrowRight size={16} />
        </Link>
        <p className="text-[10px] text-zinc-600 text-center mt-3">
          Drag the preview card · tap names to switch
        </p>
      </div>
    </div>
  );
}
