"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  ChevronDown,
  ExternalLink,
  Fingerprint,
  Globe,
  Share2,
  Sparkles,
} from "lucide-react";
import type { PortfolioArtifact } from "@/types";
import { formatProofHash } from "@/lib/portfolio-hash";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { profilePath } from "@/lib/matric";
import { cn } from "@/lib/utils";

interface ArtifactCardProps {
  artifact: PortfolioArtifact;
  expanded?: boolean;
  publicView?: boolean;
  baseUrl?: string;
}

export function ArtifactCard({
  artifact,
  expanded: defaultExpanded = false,
  publicView = false,
  baseUrl = "",
}: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const proof = formatProofHash(artifact.hash);
  const liveUrl = artifact.deployUrl?.startsWith("http")
    ? artifact.deployUrl
    : artifact.deployUrl
      ? `${baseUrl}${artifact.deployUrl}`
      : null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${profilePath(artifact.studentMatric)}#${artifact.id}`
      : `${profilePath(artifact.studentMatric)}#${artifact.id}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-2xl border overflow-hidden transition-all duration-300",
        artifact.verified
          ? "border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.06] to-transparent shadow-lg shadow-emerald-500/5"
          : "border-white/8 bg-white/[0.02] hover:border-white/14"
      )}
    >
      {artifact.verified ? (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 blur-3xl pointer-events-none" />
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 flex gap-4"
      >
        <div
          className={cn(
            "shrink-0 w-20 h-20 rounded-xl bg-gradient-to-br border border-white/10 flex items-center justify-center",
            artifact.thumbnailGradient ?? "from-cyan-500/20 to-violet-500/20"
          )}
        >
          {artifact.verified ? (
            <BadgeCheck size={28} className="text-emerald-400" />
          ) : (
            <Sparkles size={24} className="text-cyan-400/80" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                {artifact.courseName}
              </p>
              <h3 className="text-base font-semibold text-white mt-0.5 truncate">
                {artifact.title}
              </h3>
            </div>
            {artifact.score != null ? (
              <motion.span
                key={artifact.score}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-lg font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-400"
              >
                {artifact.score}
                <span className="text-xs text-zinc-500 font-normal">/{artifact.maxScore}</span>
              </motion.span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {artifact.verified ? (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                <BadgeCheck size={10} /> Verified by {artifact.lecturerName ?? "Lecturer"}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/20">
                Awaiting verification
              </span>
            )}
            <span className="text-[10px] text-zinc-600 font-mono">{proof}</span>
          </div>
        </div>

        <ChevronDown
          size={18}
          className={cn(
            "text-zinc-500 shrink-0 transition-transform mt-1",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/6"
          >
            <div className="p-5 pt-4 space-y-4">
              {artifact.description ? (
                <p className="text-sm text-zinc-400 leading-relaxed">{artifact.description}</p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {artifact.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/6"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Fingerprint size={12} className="text-violet-400" />
                Proof hash · <span className="font-mono text-zinc-400">{artifact.hash}</span>
              </div>

              <p className="text-[11px] text-zinc-600">
                Submitted {new Date(artifact.submittedAt).toLocaleString()}
                {artifact.verifiedAt
                  ? ` · Verified ${new Date(artifact.verifiedAt).toLocaleString()}`
                  : ""}
              </p>

              <div className="flex flex-wrap gap-2">
                {liveUrl ? (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-cyan-400/15 text-cyan-300 border border-cyan-400/25 hover:bg-cyan-400/25 transition-colors"
                  >
                    <Globe size={14} />
                    Live project
                  </a>
                ) : null}
                {!publicView ? (
                  <CopyLinkButton value={shareUrl} size="sm" label="Share entry" />
                ) : (
                  <CopyLinkButton value={shareUrl} size="sm" label="Share" />
                )}
                {liveUrl ? (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white border border-white/8"
                  >
                    <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}
