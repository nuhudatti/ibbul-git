"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink, Rocket, X, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { useIdeStore } from "@/store/ide-store";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore } from "@/store/project-store";
import { useAssignmentStore } from "@/store/assignment-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { normalizeMatric } from "@/lib/matric";
import { resolveStudent } from "@/lib/student-directory";

interface DeployModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { key: "building", label: "Building project...", progress: 25 },
  { key: "optimizing", label: "Optimizing assets...", progress: 55 },
  { key: "deploying", label: "Publishing to ULA edge...", progress: 85 },
] as const;

export function DeployModal({ open, onClose }: DeployModalProps) {
  const user = useAuthStore((s) => s.user);
  const projectId = useIdeStore((s) => s.projectId);
  const projectName = useIdeStore((s) => s.projectName);
  const files = useIdeStore((s) => s.files);
  const deployment = useIdeStore((s) => s.deployment);
  const submissionMeta = useIdeStore((s) => s.submissionMeta);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const setDeployment = useIdeStore((s) => s.setDeployment);
  const setLiveDeployUrl = useIdeStore((s) => s.setLiveDeployUrl);
  const resetDeployment = useIdeStore((s) => s.resetDeployment);
  const addTerminalLog = useIdeStore((s) => s.addTerminalLog);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const saveSnapshot = useProjectStore((s) => s.saveSnapshot);
  const setEnrollmentDeployUrl = useAssignmentStore((s) => s.setEnrollmentDeployUrl);
  const getStudentArtifacts = usePortfolioStore((s) => s.getStudentArtifacts);
  const updateDeploy = usePortfolioStore((s) => s.updateDeploy);

  const [phase, setPhase] = useState<"idle" | "running" | "done" | "failed">("idle");
  const ranRef = useRef(false);

  const existingUrl =
    deployment.status === "success" && deployment.url
      ? deployment.url
      : submissionMeta?.deployUrl;

  const runDeploy = async () => {
    setPhase("running");
    resetDeployment();
    let step = 0;

    while (step < STEPS.length) {
      const current = STEPS[step];
      setDeployment({
        status: current.key,
        progress: current.progress,
        logs: [...(useIdeStore.getState().deployment.logs ?? []), current.label],
      });
      addTerminalLog(current.label);
      step++;
      await new Promise((r) => setTimeout(r, 900));
    }

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          matricNumber: user?.matricNumber ?? "student",
          projectName,
          files,
        }),
      });

      if (!res.ok) throw new Error("Deploy failed");

      const data = await res.json();
      setLiveDeployUrl(data.url);
      addTerminalLog(`Deployed live: ${data.url}`);

        if (user && activeAssignmentId) {
          const matric = normalizeMatric(user.matricNumber);
          saveSnapshot(matric, activeAssignmentId, projectName, files, {
            deployUrl: data.url,
            submitted: workspaceMode === "submitted",
          });
          setEnrollmentDeployUrl(activeAssignmentId, matric, data.url);
          const assignment = useAssignmentStore.getState().assignments.find(
            (a) => a.id === activeAssignmentId
          );
          useAssignmentStore.getState().pushActivity({
            type: "deploy",
            student: resolveStudent(matric).displayName,
            matric,
            message: `deployed ${assignment?.title ?? projectName}`,
          });
        const artifacts = getStudentArtifacts(matric);
        const match = artifacts.find((a) => a.assignmentId === activeAssignmentId);
        if (match) updateDeploy(match.id, data.url);
      }

      setPhase("done");
    } catch {
      setDeployment({ status: "failed", progress: 0 });
      addTerminalLog("Deploy failed. Try again.");
      setPhase("failed");
    }
  };

  useEffect(() => {
    if (!open) {
      ranRef.current = false;
      setPhase("idle");
      return;
    }
    if (ranRef.current) return;
    ranRef.current = true;

    if (existingUrl && phase === "idle") {
      setDeployment({
        status: "success",
        url: existingUrl,
        progress: 100,
        logs: ["Using your current live deployment"],
      });
      setPhase("done");
      return;
    }

    runDeploy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    if (phase === "failed") resetDeployment();
    onClose();
  };

  const handleRedeploy = () => {
    ranRef.current = true;
    runDeploy();
  };

  const isRunning = phase === "running";
  const isSuccess = phase === "done" && (deployment.url ?? existingUrl);
  const isFailed = phase === "failed";
  const displayUrl = deployment.url ?? existingUrl;
  const isSubmitted = workspaceMode === "submitted";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="ula-glass rounded-3xl p-8 w-full max-w-lg mx-4 shadow-2xl border border-white/10 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,229,255,0.12),transparent)] pointer-events-none" />

            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl ${
                      isSuccess
                        ? "bg-emerald-500/20 ring-1 ring-emerald-400/30"
                        : isFailed
                          ? "bg-red-500/20"
                          : "bg-cyan-400/20 ring-1 ring-cyan-400/20"
                    }`}
                  >
                    {isSuccess ? (
                      <Check size={26} className="text-emerald-400" />
                    ) : (
                      <Rocket
                        size={26}
                        className={`text-cyan-400 ${isRunning ? "ula-pulse" : ""}`}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white tracking-tight">
                      {isSuccess
                        ? "Your project is live"
                        : isFailed
                          ? "Deploy failed"
                          : "Publishing to the edge"}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {isSuccess
                        ? isSubmitted
                          ? "Read-only code · live site stays updatable"
                          : "Share this link anytime — it stays on your workspace"
                        : isFailed
                          ? "Something went wrong. Try again."
                          : STEPS.find((s) => s.key === deployment.status)?.label ?? "Working…"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {isRunning ? (
                <div className="mb-6">
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-emerald-400 ula-shimmer"
                      initial={{ width: 0 }}
                      animate={{ width: `${deployment.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 text-center font-medium">
                    {deployment.progress}% · ULA edge network
                  </p>
                </div>
              ) : null}

              {isSuccess && displayUrl ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe size={16} className="text-cyan-400" />
                      <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider">
                        Live URL
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15">
                        <span className="ula-pulse w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Online
                      </span>
                    </div>
                    <p className="text-sm font-mono text-cyan-100/90 break-all leading-relaxed mb-4">
                      {displayUrl}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <CopyLinkButton value={displayUrl} className="flex-1 min-w-[140px] justify-center" />
                      <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 flex-1 min-w-[120px] px-4 py-2 rounded-xl text-sm font-medium bg-white/8 border border-white/10 text-zinc-200 hover:border-cyan-400/30 transition-all"
                      >
                        <ExternalLink size={16} />
                        Open live
                      </a>
                    </div>
                  </div>

                  <p className="text-center text-xs text-zinc-500">
                    This link stays visible in your workspace until you redeploy
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={handleRedeploy}
                      disabled={isRunning}
                    >
                      <RefreshCw size={14} className={isRunning ? "animate-spin" : ""} />
                      Redeploy
                    </Button>
                    <Button className="flex-1" onClick={handleClose}>
                      {isSubmitted ? "Back to submission" : "Continue building"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {isFailed ? (
                <div className="flex gap-2">
                  <Button className="flex-1" variant="secondary" onClick={handleRedeploy}>
                    Try again
                  </Button>
                  <Button className="flex-1" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
