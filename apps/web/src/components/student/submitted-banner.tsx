"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Lock, Rocket, Trophy, X } from "lucide-react";
import { useIdeStore } from "@/store/ide-store";
import { Button } from "@/components/ui/button";
import { LiveDeployStrip } from "@/components/ide/live-deploy-strip";

export function SubmittedBanner() {
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const submissionMeta = useIdeStore((s) => s.submissionMeta);
  const projectName = useIdeStore((s) => s.projectName);
  const exitSubmittedView = useIdeStore((s) => s.exitSubmittedView);
  const openDeployModal = useIdeStore((s) => s.openDeployModal);

  if (workspaceMode !== "submitted" || !submissionMeta) return null;

  const submittedDate = new Date(submissionMeta.submittedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative shrink-0 overflow-hidden border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-cyan-400/5 to-violet-500/10"
    >
      <div className="absolute inset-0 ula-shimmer opacity-30 pointer-events-none" />
      <div className="relative px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 shadow-lg shadow-emerald-500/10">
              <Lock size={18} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Submission snapshot
                </span>
                <span className="text-sm text-zinc-300 truncate font-medium">{projectName}</span>
                {submissionMeta.assignmentTitle ? (
                  <span className="text-xs text-zinc-500 hidden sm:inline">
                    {submissionMeta.assignmentTitle}
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Snapshot from {submittedDate}
                {submissionMeta.score != null ? (
                  <span className="text-emerald-400/90 ml-2 inline-flex items-center gap-1 font-medium">
                    <Trophy size={10} /> {submissionMeta.score}/100
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={openDeployModal}>
              <Rocket size={14} />
              Deploy / Redeploy
            </Button>
            <Button variant="ghost" size="sm" onClick={exitSubmittedView} className="text-zinc-400">
              <X size={14} />
              Close view
            </Button>
          </div>
        </div>

        <LiveDeployStrip variant="card" onRedeploy={openDeployModal} />
      </div>
    </motion.div>
  );
}
