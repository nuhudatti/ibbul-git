"use client";

import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Globe,
  Shield,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortfolioStore } from "@/store/portfolio-store";
import { useAuthStore } from "@/store/auth-store";
import { formatProofHash } from "@/lib/portfolio-hash";
import { profilePath } from "@/lib/matric";
import { cn } from "@/lib/utils";

export function PortfolioReviewPanel() {
  const user = useAuthStore((s) => s.user);
  const artifactsMap = usePortfolioStore((s) => s.artifacts);
  const verifyArtifact = usePortfolioStore((s) => s.verifyArtifact);

  const pending = useMemo(
    () =>
      Object.values(artifactsMap).filter(
        (a) => a.status === "SUBMITTED" && !a.verified
      ),
    [artifactsMap]
  );

  const verified = useMemo(
    () => Object.values(artifactsMap).filter((a) => a.verified),
    [artifactsMap]
  );

  const lecturerName = user ? `${user.firstName} ${user.lastName}` : "Lecturer";

  const [query, setQuery] = useState("");

  const pendingFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter((a) => {
      return (
        (a.studentName ?? "").toLowerCase().includes(q) ||
        (a.studentMatric ?? "").toLowerCase().includes(q) ||
        (a.title ?? "").toLowerCase().includes(q) ||
        (a.hash ?? "").toLowerCase().includes(q)
      );
    });
  }, [pending, query]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
            <Shield size={17} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Portfolio verification</h2>
            <p className="text-[10px] text-zinc-600">
              Verify → publishes to student public profile
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-400/15">
          <p className="text-lg font-semibold text-amber-300 tabular-nums">{pending.length}</p>
          <p className="text-[10px] text-zinc-600">Awaiting you</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-400/15">
          <p className="text-lg font-semibold text-emerald-300 tabular-nums">{verified.length}</p>
          <p className="text-[10px] text-zinc-600">On public /u pages</p>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">
        Verify & publish
      </p>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search student, matric, project, or ULA ID..." />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ula-scrollbar space-y-2 min-h-0">
        {pendingFiltered.length === 0 ? (
          <p className="text-xs text-zinc-600 py-8 text-center leading-relaxed">
            No portfolio artifacts match your search or there are none awaiting verification.
          </p>
        ) : (
          pendingFiltered.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.04]"
            >
              <p className="text-sm font-medium text-zinc-200">{a.studentName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{a.title}</p>
              <p className="text-[10px] font-mono text-violet-400/70 mt-1">
                {formatProofHash(a.hash)}
              </p>
              {a.score != null ? (
                <p className="text-xs text-cyan-300/80 mt-1">AI score: {a.score}/{a.maxScore}</p>
              ) : null}
              {a.deployUrl ? (
                <a
                  href={a.deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-cyan-400 mt-2"
                >
                  <ExternalLink size={10} />
                  Preview deploy
                </a>
              ) : null}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="success"
                  className="flex-1"
                  onClick={() =>
                    user &&
                    verifyArtifact(a.id, user.matricNumber, lecturerName, true)
                  }
                >
                  <BadgeCheck size={12} />
                  Verify & publish
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    user &&
                    verifyArtifact(
                      a.id,
                      user.matricNumber,
                      lecturerName,
                      false,
                      "Needs revision"
                    )
                  }
                >
                  <X size={12} />
                </Button>
              </div>
            </motion.div>
          ))
        )}

        {verified.length > 0 ? (
          <>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-4 mb-2 pt-2 border-t border-white/6">
              Live on public portfolio
            </p>
            {verified.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-emerald-500/5 border border-emerald-400/10"
              >
                <div className="min-w-0">
                  <p className="text-xs text-zinc-300 truncate">{a.studentName}</p>
                  <p className="text-[10px] text-zinc-600 truncate">{a.title}</p>
                </div>
                <Link
                  href={profilePath(a.studentMatric)}
                  target="_blank"
                  className="shrink-0 text-emerald-400 hover:text-emerald-300 p-1"
                  title="View public page"
                >
                  <Globe size={14} />
                </Link>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
