"use client";

import { motion } from "framer-motion";
import { ExternalLink, Globe, Rocket, Sparkles } from "lucide-react";
import { useIdeStore } from "@/store/ide-store";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { cn } from "@/lib/utils";

interface LiveDeployStripProps {
  variant?: "bar" | "card";
  className?: string;
  onRedeploy?: () => void;
}

export function LiveDeployStrip({ variant = "bar", className, onRedeploy }: LiveDeployStripProps) {
  const deployment = useIdeStore((s) => s.deployment);
  const submissionMeta = useIdeStore((s) => s.submissionMeta);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);

  const liveUrl = deployment.url ?? submissionMeta?.deployUrl;
  if (!liveUrl) return null;

  const isSubmitted = workspaceMode === "submitted";

  if (variant === "card") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-violet-500/5 to-emerald-500/10 p-4",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20">
            <Globe size={16} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Your live site</p>
            <p className="text-[11px] text-zinc-500">Always available while you work</p>
          </div>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20">
            <span className="ula-pulse w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>
        <p className="text-xs font-mono text-cyan-200/90 break-all mb-3 leading-relaxed">{liveUrl}</p>
        <div className="flex flex-wrap gap-2">
          <CopyLinkButton value={liveUrl} size="sm" />
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/8 border border-white/10 text-zinc-200 hover:border-cyan-400/30 transition-colors"
          >
            <ExternalLink size={14} />
            Open live
          </a>
          {onRedeploy ? (
            <button
              type="button"
              onClick={onRedeploy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-violet-300 bg-violet-500/15 border border-violet-400/25 hover:bg-violet-500/25 transition-colors"
            >
              <Rocket size={14} />
              {isSubmitted ? "Redeploy" : "Deploy again"}
            </button>
          ) : null}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={cn(
        "shrink-0 border-b border-cyan-400/15 bg-gradient-to-r from-cyan-500/8 via-transparent to-violet-500/8",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sparkles size={14} className="text-cyan-400 shrink-0" />
          <span className="text-[11px] font-medium text-cyan-300/90 shrink-0">Live deployment</span>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-zinc-300 hover:text-cyan-300 truncate transition-colors"
          >
            {liveUrl}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <CopyLinkButton value={liveUrl} size="sm" label="Copy" />
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={12} />
            Open
          </a>
          {onRedeploy ? (
            <button
              type="button"
              onClick={onRedeploy}
              className="inline-flex items-center gap-1 text-[11px] text-violet-300 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-400/20 hover:bg-violet-500/25 transition-colors"
            >
              <Rocket size={12} />
              Redeploy
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
