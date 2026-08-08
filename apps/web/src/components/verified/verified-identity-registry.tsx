"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  LayoutGrid,
  List,
  Radio,
  Rocket,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import type { CohortBuilder, CohortStats } from "@/lib/cohort-registry";
import type { PortfolioArtifact, PortfolioFeedEvent } from "@/types";
import { RegistryLiveHero } from "./registry-live-hero";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Logo } from "@/components/ui/logo";
import { profilePath } from "@/lib/matric";
import { cn } from "@/lib/utils";

type FilterId = "all" | "verified" | "building" | "deployed";
type ViewMode = "grid" | "list";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function BuilderCard({ builder, index }: { builder: CohortBuilder; index: number }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="group relative min-w-0"
    >
      <Link
        href={profilePath(builder.matric)}
        className="block w-full h-full rounded-2xl border border-white/8 bg-[#0a0a12]/80 overflow-hidden transition-all duration-300 hover:border-cyan-400/25 hover:shadow-[0_0_40px_rgba(0,229,255,0.08)] hover:-translate-y-0.5"
      >
        <div
          className={cn(
            "h-1 w-full",
            builder.status === "verified"
              ? "bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500"
              : builder.status === "building"
                ? "bg-gradient-to-r from-amber-500/80 to-cyan-500/60"
                : "bg-zinc-700"
          )}
        />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-400/40 to-violet-500/40 opacity-0 group-hover:opacity-100 transition-opacity blur-sm" />
              <UserAvatar
                name={builder.displayName}
                initials={builder.avatar}
                avatarUrl={
                  builder.avatarUrl
                    ? `${builder.avatarUrl.split("?")[0]}?v=1`
                    : undefined
                }
                size="lg"
                className="relative"
              />
              {builder.status === "verified" ? (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-[#0a0a12]">
                  <BadgeCheck size={10} className="text-white" />
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white truncate group-hover:text-cyan-100 transition-colors">
                {builder.displayName}
              </h3>
              <p className="text-xs font-mono text-cyan-400/80 mt-0.5">{builder.matric}</p>
              <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{builder.program}</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-4 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {builder.headline}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <div className="rounded-lg bg-white/[0.03] border border-white/6 px-2 py-2 text-center">
              <p className="text-sm font-bold text-white tabular-nums">{builder.verifiedCount}</p>
              <p className="text-[9px] text-zinc-600 uppercase">Verified</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/6 px-2 py-2 text-center">
              <p className="text-sm font-bold text-white tabular-nums">{builder.totalArtifacts}</p>
              <p className="text-[9px] text-zinc-600 uppercase">Projects</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/6 px-2 py-2 text-center">
              <p className="text-sm font-bold text-emerald-400/90 tabular-nums">
                {builder.avgScore != null ? `${builder.avgScore}%` : "—"}
              </p>
              <p className="text-[9px] text-zinc-600 uppercase">Avg</p>
            </div>
          </div>

          {builder.topProject ? (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
              <Rocket size={11} className="text-violet-400 shrink-0" />
              <span className="truncate">{builder.topProject}</span>
            </div>
          ) : null}

          {builder.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-3">
              {builder.skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/6"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                builder.status === "verified"
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-400/20"
                  : builder.status === "building"
                    ? "text-amber-400/90 bg-amber-500/10 border border-amber-400/15"
                    : "text-zinc-500 bg-white/5 border border-white/8"
              )}
            >
              {builder.status === "verified"
                ? "Verified identity"
                : builder.status === "building"
                  ? "Building"
                  : "Emerging"}
            </span>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1 group-hover:text-cyan-400/80 transition-colors">
              View portfolio
              <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function LiveFeedPanel({ feed }: { feed: PortfolioFeedEvent[] }) {
  return (
    <div className="ula-glass rounded-2xl border border-white/8 overflow-hidden h-fit xl:sticky xl:top-24">
      <div className="px-4 py-3 border-b border-white/6 flex items-center gap-2 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
        <Radio size={14} className="text-emerald-400 ula-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Network pulse
        </span>
      </div>
      <div className="max-h-[min(70vh,640px)] overflow-y-auto">
        {feed.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02]"
          >
            <p className="text-xs text-zinc-300">
              <Link href={profilePath(e.studentMatric)} className="text-cyan-300/90 font-medium hover:underline">
                {e.studentName}
              </Link>{" "}
              <span className="text-zinc-600">{e.message}</span>
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{e.title}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function VerifiedIdentityRegistry() {
  const [builders, setBuilders] = useState<CohortBuilder[]>([]);
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [feed, setFeed] = useState<PortfolioFeedEvent[]>([]);
  const [heroArtifacts, setHeroArtifacts] = useState<PortfolioArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [view, setView] = useState<ViewMode>("grid");

  const load = () =>
    fetch("/api/portfolio/cohort")
      .then((r) => r.json())
      .then((d) => {
        setBuilders(d.builders ?? []);
        setStats(d.stats ?? null);
        setFeed(d.feed ?? []);
        setHeroArtifacts(d.heroArtifacts ?? []);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return builders.filter((b) => {
      if (filter === "verified" && b.status !== "verified") return false;
      if (filter === "building" && b.status !== "building") return false;
      if (filter === "deployed" && b.liveDeploys === 0) return false;
      if (!q) return true;
      return (
        b.displayName.toLowerCase().includes(q) ||
        b.matric.toLowerCase().includes(q) ||
        b.program.toLowerCase().includes(q) ||
        b.topProject?.toLowerCase().includes(q)
      );
    });
  }, [builders, query, filter]);

  return (
    <div className="min-h-screen ula-mesh-bg ula-grid-pattern">
      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#050508]/75 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="sm" showText={false} />
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80 font-medium leading-none">
                IBBUL ULA
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Verified identity registry</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/workspace"
              className="text-xs font-medium text-white px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/90 to-violet-600/90 border border-white/10"
            >
              Enter workspace
            </Link>
          </nav>
        </div>
      </header>

      <RegistryLiveHero
        stats={stats}
        heroArtifacts={heroArtifacts}
        feed={feed}
        featured={builders.filter((b) => b.status === "verified").slice(0, 3)}
      />

      <main className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, matric, program, project…"
                  className="w-full h-11 pl-10 pr-4 rounded-xl ula-glass text-sm text-white placeholder:text-zinc-600 border border-white/8 focus:border-cyan-400/30 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(
                  [
                    { id: "all" as const, label: "All cohort" },
                    { id: "verified" as const, label: "Verified" },
                    { id: "building" as const, label: "Building" },
                    { id: "deployed" as const, label: "Live deploy" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border transition-all",
                      filter === f.id
                        ? "bg-cyan-500/15 border-cyan-400/30 text-cyan-200"
                        : "border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/12"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
                <div className="flex rounded-lg border border-white/8 overflow-hidden ml-1">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={cn("p-2", view === "grid" ? "bg-white/10 text-white" : "text-zinc-600")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={cn("p-2", view === "list" ? "bg-white/10 text-white" : "text-zinc-600")}
                    aria-label="List view"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-600 mb-6 flex items-center gap-2">
              <Zap size={12} className="text-cyan-500/80" />
              Showing {filtered.length} of {builders.length} builders · Updates every 20s
            </p>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-2xl border border-white/6 bg-white/[0.02] animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                No builders match your search. Try another filter.
              </div>
            ) : (
              <div
                className={cn(
                  view === "grid"
                    ? "grid sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4"
                    : "flex flex-col gap-3"
                )}
              >
                <AnimatePresence mode="popLayout">
                  {filtered.map((b, i) => (
                    <BuilderCard key={b.matric} builder={b} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <aside className="w-full lg:w-[300px] shrink-0">
            <LiveFeedPanel feed={feed} />
            <div className="mt-4 rounded-2xl border border-white/8 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-5">
              <p className="text-sm font-semibold text-white mb-2">For institutions & employers</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Every profile is matric-bound, QR-verifiable, and issued only through Project ULA.
                This registry scales from one cohort to an entire nation of builders.
              </p>
              <Link
                href={profilePath("U22/FNS/CSC/1103")}
                className="mt-3 inline-flex text-xs text-cyan-400 hover:underline"
              >
                Explore a verified builder →
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-white/6 py-8 text-center">
        <p className="text-xs text-zinc-600">
          IBBUL ULA · Verified Proof-of-Work Portfolio Engine · A new era of credentialing
        </p>
      </footer>
    </div>
  );
}
