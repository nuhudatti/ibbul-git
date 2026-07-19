"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Fingerprint,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import type { PortfolioArtifact } from "@/types";
import { formatProofHash } from "@/lib/portfolio-hash";
import { CredentialQr } from "@/components/portfolio/credential-qr";
import { profilePath } from "@/lib/matric";
import { cn } from "@/lib/utils";

export type OrbitVariant = "full" | "compact" | "embedded";

const ORBIT_SLOTS = [
  { angle: 0, radius: 168, dur: 18 },
  { angle: 52, radius: 185, dur: 22 },
  { angle: 104, radius: 172, dur: 20 },
  { angle: 156, radius: 190, dur: 24 },
  { angle: 208, radius: 175, dur: 19 },
  { angle: 260, radius: 182, dur: 21 },
  { angle: 312, radius: 168, dur: 23 },
];

const VARIANT_CONFIG: Record<
  OrbitVariant,
  {
    scale: number;
    orbitPeriod: number;
    chipWidth: number;
    centerWidth: string;
    outerRing: string;
    innerRing: string;
    minHeight: string;
    hint: string;
  }
> = {
  full: {
    scale: 1,
    orbitPeriod: 52,
    chipWidth: 148,
    centerWidth: "w-[210px] md:w-[250px]",
    outerRing: "w-[280px] h-[280px] md:w-[340px] md:h-[340px]",
    innerRing: "w-[220px] h-[220px] md:w-[260px] md:h-[260px]",
    minHeight: "min-h-[320px] md:min-h-[400px]",
    hint: "Drag chips or card · hover to focus",
  },
  compact: {
    scale: 0.68,
    orbitPeriod: 44,
    chipWidth: 118,
    centerWidth: "w-[175px] sm:w-[195px]",
    outerRing: "w-[200px] h-[200px] sm:w-[230px] sm:h-[230px]",
    innerRing: "w-[155px] h-[155px] sm:w-[180px] sm:h-[180px]",
    minHeight: "min-h-[280px] sm:min-h-[320px]",
    hint: "Hover · drag · tap dots below",
  },
  embedded: {
    scale: 0.5,
    orbitPeriod: 48,
    chipWidth: 96,
    centerWidth: "w-[140px]",
    outerRing: "w-[160px] h-[160px]",
    innerRing: "w-[120px] h-[120px]",
    minHeight: "min-h-[200px]",
    hint: "Drag to explore",
  },
};

function scaleSlot(slot: (typeof ORBIT_SLOTS)[0], scale: number) {
  return {
    ...slot,
    radius: Math.round(slot.radius * scale),
  };
}

function FloatingArtifactChip({
  artifact,
  slot,
  index,
  isActive,
  chipWidth,
  onSelect,
}: {
  artifact: PortfolioArtifact;
  slot: ReturnType<typeof scaleSlot>;
  index: number;
  isActive: boolean;
  chipWidth: number;
  onSelect: () => void;
}) {
  const rad = (slot.angle * Math.PI) / 180;
  const baseX = Math.cos(rad) * slot.radius;
  const baseY = Math.sin(rad) * slot.radius * 0.55;

  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `calc(50% + ${baseX}px)`,
        top: `calc(50% + ${baseY}px)`,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 1,
        scale: isActive ? 1.1 : 1,
        x: [0, 5, -4, 0],
        y: [0, -7, 4, 0],
      }}
      transition={{
        opacity: { delay: index * 0.08 },
        scale: { duration: 0.25 },
        x: { duration: slot.dur, repeat: Infinity, ease: "easeInOut" },
        y: { duration: slot.dur + 2, repeat: Infinity, ease: "easeInOut" },
      }}
      drag
      dragConstraints={{ left: -20, right: 20, top: -20, bottom: 20 }}
      dragElastic={0.35}
      whileDrag={{ scale: 1.12, zIndex: 40, cursor: "grabbing" }}
      onMouseEnter={onSelect}
      onFocus={onSelect}
    >
      {artifact.verified ? (
        <span
          className={cn(
            "absolute -inset-1 rounded-2xl border border-emerald-400/30 pointer-events-none",
            isActive && "ula-pulse border-emerald-400/50"
          )}
          aria-hidden
        />
      ) : null}
      <Link
        href={profilePath(artifact.studentMatric)}
        style={{ width: chipWidth }}
        className={cn(
          "relative block rounded-xl border backdrop-blur-xl p-2.5 transition-all duration-300",
          artifact.thumbnailGradient && `bg-gradient-to-br ${artifact.thumbnailGradient}`,
          artifact.verified
            ? isActive
              ? "border-emerald-400/55 bg-emerald-500/20 shadow-[0_0_28px_rgba(16,185,129,0.28)]"
              : "border-emerald-400/30 bg-black/55 hover:border-emerald-400/45"
            : "border-white/10 bg-black/45 hover:border-cyan-400/25"
        )}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          {artifact.verified ? (
            <span className="inline-flex items-center gap-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-1 py-0.5 rounded-full border border-emerald-400/35">
              <BadgeCheck size={7} />
              Verified
            </span>
          ) : (
            <span className="text-[7px] uppercase tracking-wider text-amber-400/80">Building</span>
          )}
          {artifact.score != null ? (
            <span className="text-[9px] font-bold text-cyan-300 tabular-nums">{artifact.score}%</span>
          ) : null}
        </div>
        <p className="text-[10px] font-semibold text-white line-clamp-2 leading-tight">{artifact.title}</p>
        <p className="text-[8px] text-zinc-500 mt-0.5 truncate">{artifact.studentName}</p>
        <p className="text-[7px] font-mono text-cyan-400/75 mt-0.5 truncate">
          {formatProofHash(artifact.hash)}
        </p>
      </Link>
    </motion.div>
  );
}

function MiniVerifiedCredential({
  artifact,
  profileUrl,
  compact,
}: {
  artifact: PortfolioArtifact;
  profileUrl: string;
  compact: boolean;
}) {
  const certId = `ULA-${artifact.hash.slice(0, 4).toUpperCase()}-${artifact.hash.slice(4, 8).toUpperCase()}`;

  return (
    <motion.div
      drag
      dragConstraints={{ left: -10, right: 10, top: -10, bottom: 10 }}
      dragElastic={0.2}
      whileDrag={{ scale: 1.02 }}
      className={cn(
        "relative w-full rounded-2xl border overflow-hidden cursor-grab active:cursor-grabbing shadow-2xl",
        artifact.verified
          ? "border-emerald-400/45 bg-[#080f0d]/95 shadow-emerald-500/25"
          : "border-white/15 bg-[#0a0a12]/95"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center font-black tracking-[0.35em] text-white/4 select-none",
          compact ? "text-2xl" : "text-[42px]"
        )}
        aria-hidden
      >
        IBBUL ULA
      </div>
      <motion.div
        className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
        animate={{ top: ["12%", "88%", "12%"] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />

      <div className={cn("relative", compact ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-400/90 font-semibold">
                Live verified
              </span>
            </div>
            {artifact.verified ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={compact ? 12 : 14} />
                <span className="text-[9px] font-bold uppercase tracking-wide">VPE sealed</span>
              </div>
            ) : null}
          </div>
          <div className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-0.5">
            <CredentialQr url={profileUrl} size={compact ? 44 : 52} />
          </div>
        </div>

        <p className="text-[9px] font-mono text-zinc-500 mb-0.5">{certId}</p>
        <p className={cn("font-bold text-white leading-snug", compact ? "text-xs" : "text-sm")}>
          {artifact.title}
        </p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{artifact.studentName}</p>

        <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono text-cyan-400/85 bg-black/35 rounded-lg px-2 py-1 border border-white/6">
          <Fingerprint size={9} />
          {formatProofHash(artifact.hash)}
        </div>

        {artifact.score != null ? (
          <p className="text-[10px] font-bold text-emerald-300 tabular-nums mt-1.5">
            {artifact.score}% verified score
          </p>
        ) : null}

        {artifact.deployUrl ? (
          <p className="text-[9px] text-violet-400/85 mt-1 flex items-center gap-1">
            <Rocket size={9} /> Live deploy sealed
          </p>
        ) : null}

        <Link
          href={profilePath(artifact.studentMatric)}
          className="mt-2 block text-center text-[9px] font-semibold uppercase tracking-wider text-cyan-400/90 hover:text-cyan-300"
        >
          Open portfolio →
        </Link>
      </div>
    </motion.div>
  );
}

export interface ArtifactOrbitStageProps {
  artifacts: PortfolioArtifact[];
  activeIndex: number;
  onSelectIndex: (i: number) => void;
  orbitPaused: boolean;
  variant?: OrbitVariant;
  className?: string;
}

export function ArtifactOrbitStage({
  artifacts,
  activeIndex,
  onSelectIndex,
  orbitPaused,
  variant = "full",
  className,
}: ArtifactOrbitStageProps) {
  const cfg = VARIANT_CONFIG[variant];
  const slots = ORBIT_SLOTS.map((s) => scaleSlot(s, cfg.scale));
  const active = artifacts[activeIndex] ?? artifacts[0];
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const profileUrl = active && origin ? `${origin}${profilePath(active.studentMatric)}` : "";
  const orbitItems = artifacts.slice(0, ORBIT_SLOTS.length);

  if (!active) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-zinc-600 text-sm ula-shimmer rounded-3xl border border-white/8",
          cfg.minHeight,
          className
        )}
      >
        Connecting to live network…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full max-w-[420px] mx-auto aspect-square",
        cfg.minHeight,
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className={cn("rounded-full border border-dashed border-cyan-400/15", cfg.outerRing)}
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className={cn("absolute rounded-full border border-emerald-400/12", cfg.innerRing)}
          animate={{ rotate: -360 }}
          transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className={cn(
            "absolute rounded-full bg-emerald-400/12 blur-3xl",
            variant === "compact" ? "w-16 h-16" : "w-28 h-28"
          )}
          animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <motion.div
        className="absolute inset-0"
        animate={orbitPaused ? { rotate: 0 } : { rotate: 360 }}
        transition={
          orbitPaused
            ? { duration: 0.5 }
            : { duration: cfg.orbitPeriod, repeat: Infinity, ease: "linear" }
        }
      >
        <motion.div
          className="absolute inset-0"
          animate={orbitPaused ? { rotate: 0 } : { rotate: -360 }}
          transition={
            orbitPaused
              ? { duration: 0.5 }
              : { duration: cfg.orbitPeriod, repeat: Infinity, ease: "linear" }
          }
        >
          {orbitItems.map((a, i) => (
            <FloatingArtifactChip
              key={a.id}
              artifact={a}
              slot={slots[i]}
              index={i}
              isActive={i === activeIndex}
              chipWidth={cfg.chipWidth}
              onSelect={() => onSelectIndex(i)}
            />
          ))}
        </motion.div>
      </motion.div>

      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto",
          cfg.centerWidth
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.32 }}
          >
            <MiniVerifiedCredential
              artifact={active}
              profileUrl={profileUrl}
              compact={variant !== "full"}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.18em] text-zinc-600 whitespace-nowrap pointer-events-none">
        {cfg.hint}
      </p>
    </div>
  );
}

/** Dot indicators for active artifact */
export function ArtifactOrbitDots({
  artifacts,
  activeIndex,
  onSelect,
  className,
}: {
  artifacts: PortfolioArtifact[];
  activeIndex: number;
  onSelect: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center gap-1.5", className)}>
      {artifacts.map((a, i) => (
        <button
          key={a.id}
          type="button"
          aria-label={`Show ${a.title}`}
          onClick={() => onSelect(i)}
          className={cn(
            "h-1.5 rounded-full transition-all",
            i === activeIndex ? "w-6 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/40"
          )}
        />
      ))}
    </div>
  );
}
