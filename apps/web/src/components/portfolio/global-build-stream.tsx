"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Globe,
  Radio,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import type { PortfolioFeedEvent } from "@/types";
import Link from "next/link";
import { normalizeMatric, profilePath } from "@/lib/matric";
import { cn } from "@/lib/utils";

const ICONS = {
  deploy: Rocket,
  submit: Send,
  verify: BadgeCheck,
  portfolio: Sparkles,
  grade: Globe,
} as const;

const TYPE_STYLES: Record<
  PortfolioFeedEvent["type"],
  { ring: string; icon: string; label: string }
> = {
  verify: {
    ring: "border-emerald-400/30 bg-emerald-500/10",
    icon: "text-emerald-400",
    label: "Verified",
  },
  deploy: {
    ring: "border-violet-400/25 bg-violet-500/10",
    icon: "text-violet-400",
    label: "Deployed",
  },
  submit: {
    ring: "border-cyan-400/25 bg-cyan-500/10",
    icon: "text-cyan-400",
    label: "Submitted",
  },
  portfolio: {
    ring: "border-amber-400/20 bg-amber-500/10",
    icon: "text-amber-400",
    label: "Identity",
  },
  grade: {
    ring: "border-white/15 bg-white/5",
    icon: "text-zinc-300",
    label: "Graded",
  },
};

type FeedFilter = "all" | PortfolioFeedEvent["type"];

interface FeedStats {
  total: number;
  verifyCount: number;
  deployCount: number;
}

export function GlobalBuildStream({
  variant = "compact",
}: {
  variant?: "compact" | "featured" | "minimal" | "home";
}) {
  const [feed, setFeed] = useState<PortfolioFeedEvent[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const isFeatured = variant === "featured";
  const isMinimal = variant === "minimal";
  const isHome = variant === "home";

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/portfolio/feed");
      const data = await res.json();
      const incoming: PortfolioFeedEvent[] = data.feed ?? [];
      const fresh = new Set<string>();
      incoming.forEach((e) => {
        if (!seenRef.current.has(e.id)) fresh.add(e.id);
        seenRef.current.add(e.id);
      });
      if (fresh.size > 0 && seenRef.current.size > incoming.length) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 2400);
      }
      setFeed(incoming);
      setStats(data.stats ?? null);
      setUpdatedAt(data.updatedAt ?? null);
    } catch {
      /* keep last feed */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = isFeatured || isHome ? 8000 : 12000;
    const t = setInterval(() => load(), interval);
    return () => clearInterval(t);
  }, [load, isFeatured, isHome]);

  const filtered =
    filter === "all" ? feed : feed.filter((e) => e.type === filter);
  const display = filtered.slice(
    0,
    isFeatured ? 14 : isHome ? 8 : isMinimal ? 4 : 6
  );

  const filters: { id: FeedFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "verify", label: "Verified" },
    { id: "deploy", label: "Deploy" },
    { id: "submit", label: "Submit" },
  ];

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        isFeatured
          ? "rounded-3xl border border-white/10 bg-black/50 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          : isHome
            ? "rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
            : isMinimal
              ? "rounded-xl border border-white/6 bg-black/20"
              : "rounded-2xl border border-white/8 bg-black/30"
      )}
    >
      {!isMinimal ? (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.04] via-transparent to-violet-600/[0.06] pointer-events-none" />
      ) : null}

      {isHome ? (
        <header className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-500/10">
              <Radio size={14} className="text-cyan-400 ula-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Recent network activity</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {stats ? (
                  <>
                    <span className="text-zinc-400 tabular-nums">{stats.total}</span> events
                    {" · "}
                    <span className="text-emerald-400/90 tabular-nums">{stats.verifyCount}</span>{" "}
                    verified
                    {updatedAt ? (
                      <>
                        {" · "}
                        synced {formatSync(updatedAt)}
                      </>
                    ) : null}
                  </>
                ) : (
                  "Loading live feed…"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load(true)}
              className="p-2 rounded-lg border border-white/8 text-zinc-500 hover:text-white hover:border-white/15 transition-colors"
              aria-label="Refresh activity"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <Link
              href="/verified"
              className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1"
            >
              Registry
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </header>
      ) : null}

      {!isMinimal && !isHome ? (
      <header className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-white/6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 shrink-0">
            <Radio size={16} className="text-emerald-400 ula-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#050508] ula-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Live global build stream
            </h3>
            <p className="text-[11px] text-zinc-500 truncate">
              Real submissions, deploys, and lecturer verifications across ULA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stats ? (
            <span className="hidden md:inline text-[10px] uppercase tracking-wider text-zinc-600 tabular-nums">
              {stats.verifyCount} verified · {stats.deployCount} live
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => load(true)}
            className="p-2 rounded-lg border border-white/8 bg-white/5 text-zinc-400 hover:text-white hover:border-white/15 transition-colors"
            aria-label="Refresh stream"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Link
            href="/verified"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 hover:bg-emerald-500/20 transition-all"
          >
            Registry
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </header>
      ) : null}

      {isFeatured ? (
        <div className="relative flex flex-wrap gap-1.5 px-4 sm:px-5 py-2.5 border-b border-white/[0.04]">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all",
                filter === f.id
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                  : "text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {f.label}
            </button>
          ))}
          {updatedAt ? (
            <span className="ml-auto text-[10px] text-zinc-600 self-center tabular-nums">
              Synced {formatSync(updatedAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "relative ula-scrollbar overflow-y-auto",
          isFeatured
            ? "max-h-[min(52vh,480px)]"
            : isHome
              ? "max-h-[300px]"
              : isMinimal
                ? "max-h-[168px]"
                : "max-h-[220px]"
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {display.length === 0 ? (
            <p className="px-5 py-6 text-sm text-zinc-600 text-center">No recent activity.</p>
          ) : (
            display.map((event, i) => {
              const Icon = ICONS[event.type] ?? Sparkles;
              const style = TYPE_STYLES[event.type];
              const isNew = newIds.has(event.id);
              const matric = normalizeMatric(event.studentMatric);

              if (isMinimal) {
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <p className="text-xs text-zinc-400 truncate">
                      <Link href={profilePath(matric)} className="text-zinc-300 hover:text-white">
                        {event.studentName}
                      </Link>
                      <span className="text-zinc-600"> — </span>
                      {event.message}
                    </p>
                    <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">
                      {formatTime(event.timestamp)}
                    </span>
                  </motion.div>
                );
              }

              return (
                <motion.article
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.12) }}
                  className={cn(
                    "group flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors",
                    isNew && "ula-feed-new"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border",
                      style.ring
                    )}
                  >
                    <Icon size={15} className={style.icon} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border",
                          style.ring,
                          style.icon
                        )}
                      >
                        {style.label}
                      </span>
                      {event.score != null && event.type === "verify" ? (
                        <span className="text-[10px] font-bold text-emerald-400 tabular-nums">
                          {event.score}%
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-snug">
                      <Link
                        href={profilePath(matric)}
                        className="font-semibold text-cyan-300/95 hover:text-cyan-200 transition-colors"
                      >
                        {event.studentName}
                      </Link>
                      <span className="text-zinc-600"> · </span>
                      <span className="text-zinc-400">{event.message}</span>
                    </p>
                    <Link
                      href={profilePath(matric)}
                      className="text-[10px] text-zinc-500 hover:text-violet-300 truncate block mt-0.5 transition-colors"
                    >
                      {event.title}
                    </Link>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-zinc-600 tabular-nums">
                      {formatTime(event.timestamp)}
                    </span>
                    {event.type === "verify" ? (
                      <Link
                        href="/verified"
                        className="opacity-0 group-hover:opacity-100 text-[9px] text-emerald-400/90 uppercase tracking-wider flex items-center gap-0.5 transition-opacity"
                      >
                        <Zap size={9} /> Registry
                      </Link>
                    ) : null}
                  </div>
                </motion.article>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {isFeatured ? (
        <footer className="relative flex items-center justify-between px-5 py-3 border-t border-white/6 bg-black/20">
          <p className="text-[10px] text-zinc-600">
            Every line is a real network event · click a name to open their portfolio
          </p>
          <Link
            href="/verified"
            className="text-[11px] font-semibold text-cyan-400/90 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            Full verified registry
            <ArrowUpRight size={12} />
          </Link>
        </footer>
      ) : null}
    </section>
  );
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function formatSync(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
