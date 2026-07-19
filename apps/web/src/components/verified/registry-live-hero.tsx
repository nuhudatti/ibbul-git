"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Globe2,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CohortBuilder, CohortStats } from "@/lib/cohort-registry";
import type { PortfolioArtifact, PortfolioFeedEvent } from "@/types";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  ArtifactOrbitDots,
  ArtifactOrbitStage,
} from "@/components/verified/artifact-orbit-stage";
import { profilePath } from "@/lib/matric";
import { cn } from "@/lib/utils";

function StatPill({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/40 px-4 py-3 backdrop-blur-xl">
      <div className={cn("absolute inset-0 opacity-25 bg-gradient-to-br", accent)} aria-hidden />
      <div className="relative flex items-center gap-2.5">
        <Icon size={16} className="text-cyan-400 shrink-0" />
        <div>
          <p className="text-lg font-bold text-white tabular-nums leading-none">{value}</p>
          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface RegistryLiveHeroProps {
  stats: CohortStats | null;
  heroArtifacts: PortfolioArtifact[];
  feed: PortfolioFeedEvent[];
  featured: CohortBuilder[];
}

export function RegistryLiveHero({
  stats,
  heroArtifacts,
  feed,
  featured,
}: RegistryLiveHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [tick, setTick] = useState(0);
  const [stageHovered, setStageHovered] = useState(false);

  const verifiedCount = heroArtifacts.filter((a) => a.verified).length;
  const latestFeed = feed[0];

  useEffect(() => {
    if (heroArtifacts.length === 0 || stageHovered) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroArtifacts.length);
      setTick((t) => t + 1);
    }, 3800);
    return () => clearInterval(interval);
  }, [heroArtifacts.length, stageHovered]);

  const displayArtifacts = useMemo(() => {
    if (heroArtifacts.length > 0) return heroArtifacts;
    return [];
  }, [heroArtifacts]);

  return (
    <section className="relative overflow-hidden border-b border-white/6 min-h-[min(92vh,920px)]">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-[#050508] to-[#050508] pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center lg:text-left z-10"
          >
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-cyan-400/90 font-medium mb-5 px-4 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5">
              <Radio size={12} className="ula-pulse text-emerald-400" />
              Live network · {verifiedCount} verified artifacts orbiting
            </p>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              Verified Proof-of-Work
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-violet-400 bg-clip-text text-transparent">
                Identity Registry
              </span>
            </h1>
            <p className="text-base text-zinc-400 mt-5 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Real student artifacts orbit the network — each one is hashed, deployable, and
              lecturer-verified. Drag a chip or watch the live credential preview breathe.
            </p>

            {stats ? (
              <div className="grid grid-cols-2 gap-2 mt-8 max-w-md mx-auto lg:mx-0">
                <StatPill
                  label="Builders"
                  value={stats.totalBuilders}
                  icon={Users}
                  accent="from-cyan-500/30 to-transparent"
                />
                <StatPill
                  label="Verified"
                  value={stats.verifiedArtifacts}
                  icon={BadgeCheck}
                  accent="from-emerald-500/30 to-transparent"
                />
                <StatPill
                  label="Artifacts"
                  value={stats.totalArtifacts}
                  icon={Sparkles}
                  accent="from-violet-500/30 to-transparent"
                />
                <StatPill
                  label="Avg score"
                  value={stats.networkAvgScore != null ? `${stats.networkAvgScore}%` : "—"}
                  icon={TrendingUp}
                  accent="from-amber-500/20 to-transparent"
                />
              </div>
            ) : null}

            {latestFeed ? (
              <motion.div
                key={tick}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-left max-w-md mx-auto lg:mx-0"
              >
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                  Just now on the network
                </p>
                <p className="text-sm text-zinc-300">
                  <span className="text-cyan-300 font-medium">{latestFeed.studentName}</span>{" "}
                  {latestFeed.message}
                </p>
              </motion.div>
            ) : null}

            {featured.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
                {featured.slice(0, 3).map((b) => (
                  <Link
                    key={b.matric}
                    href={profilePath(b.matric)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border border-emerald-400/20 bg-emerald-500/5 text-xs text-white hover:bg-emerald-500/10"
                  >
                    <UserAvatar
                      name={b.displayName}
                      initials={b.avatar}
                      avatarUrl={b.avatarUrl}
                      size="sm"
                    />
                    {b.displayName.split(" ")[0]}
                  </Link>
                ))}
              </div>
            ) : null}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 pb-6"
            onMouseEnter={() => setStageHovered(true)}
            onMouseLeave={() => setStageHovered(false)}
          >
            {displayArtifacts.length > 0 ? (
              <>
                <ArtifactOrbitStage
                  artifacts={displayArtifacts}
                  activeIndex={activeIndex}
                  onSelectIndex={setActiveIndex}
                  orbitPaused={stageHovered}
                  variant="full"
                />
                <ArtifactOrbitDots
                  artifacts={displayArtifacts}
                  activeIndex={activeIndex}
                  onSelect={setActiveIndex}
                  className="mt-6"
                />
              </>
            ) : (
              <div className="h-[360px] flex items-center justify-center text-zinc-600 text-sm">
                Loading live artifacts…
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center mt-10"
        >
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            <Globe2 size={11} />
            Scroll to explore full cohort
          </span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="block w-px h-8 bg-gradient-to-b from-zinc-600 to-transparent ml-4"
          />
        </motion.div>
      </div>
    </section>
  );
}
