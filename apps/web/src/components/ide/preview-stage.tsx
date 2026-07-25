"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Lock,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Code2,
  Sparkles,
} from "lucide-react";
import { useIdeStore } from "@/store/ide-store";
import { useAuthStore } from "@/store/auth-store";
import { buildPreviewHtml } from "@/lib/build-preview";
import { matricToSlug } from "@/lib/matric";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreviewDevice } from "@/store/ide-store";

const DEVICES: { id: PreviewDevice; icon: typeof Monitor; label: string; width: string }[] = [
  { id: "desktop", icon: Monitor, label: "Desktop", width: "100%" },
  { id: "tablet", icon: Tablet, label: "Tablet", width: "768px" },
  { id: "mobile", icon: Smartphone, label: "Mobile", width: "390px" },
];

export function PreviewStage() {
  const files = useIdeStore((s) => s.files);
  const previewKey = useIdeStore((s) => s.previewKey);
  const previewDevice = useIdeStore((s) => s.previewDevice);
  const projectId = useIdeStore((s) => s.projectId);
  const projectName = useIdeStore((s) => s.projectName);
  const isDirty = useIdeStore((s) => s.isDirty);
  const refreshPreview = useIdeStore((s) => s.refreshPreview);
  const setPreviewDevice = useIdeStore((s) => s.setPreviewDevice);
  const deployment = useIdeStore((s) => s.deployment);
  const submissionMeta = useIdeStore((s) => s.submissionMeta);
  const openDeployModal = useIdeStore((s) => s.openDeployModal);
  const user = useAuthStore((s) => s.user);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const srcDoc = useMemo(() => buildPreviewHtml(files), [files, previewKey]);
  const liveDeployUrl = deployment.url ?? submissionMeta?.deployUrl;
  const safeMatric = user?.matricNumber ? matricToSlug(user.matricNumber) : "student";
  const previewUrl =
    liveDeployUrl ??
    `https://${safeMatric.toLowerCase()}.preview.ula.edu/${projectId}`;
  const isLiveHosted = Boolean(liveDeployUrl);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshPreview();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const deviceWidth = DEVICES.find((d) => d.id === previewDevice)?.width ?? "100%";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col min-h-0 bg-[#06060a] relative overflow-hidden"
    >
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,229,255,0.08),transparent)]"
      />

      {/* Toolbar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20">
            <span className="ula-pulse w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-emerald-300">Live</span>
          </div>
          <span className="text-sm text-zinc-400 hidden sm:inline">{projectName}</span>
          {isDirty ? (
            <span className="text-[10px] text-amber-400/80">syncing changes…</span>
          ) : (
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Sparkles size={10} /> up to date
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/4 border border-white/6">
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPreviewDevice(id)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                previewDevice === id
                  ? "bg-cyan-400/15 text-cyan-300 shadow-sm shadow-cyan-400/10"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon size={14} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleRefresh} title="Refresh">
            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
          </Button>
          <a
            href={`data:text/html;charset=utf-8,${encodeURIComponent(srcDoc)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Browser frame — centered stage */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-auto ula-scrollbar">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex flex-col h-full max-h-full shadow-2xl shadow-black/50"
          style={{ width: deviceWidth, maxWidth: "100%" }}
        >
          {/* Chrome */}
          <div className="ula-glass rounded-t-2xl border border-white/10 border-b-0 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/6 min-w-0">
              <Lock size={12} className={cn("shrink-0", isLiveHosted ? "text-emerald-400" : "text-zinc-500")} />
              <span
                className={cn(
                  "text-xs truncate font-mono",
                  isLiveHosted ? "text-emerald-300/90" : "text-zinc-400"
                )}
              >
                {previewUrl.replace(/^https?:\/\//, "")}
              </span>
              {isLiveHosted ? (
                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                  LIVE
                </span>
              ) : null}
            </div>
          </div>

          {/* Viewport */}
          <div className="flex-1 min-h-[320px] relative bg-[#1a1a1a] rounded-b-2xl border border-white/10 border-t-0 overflow-hidden">
            <iframe
              key={previewKey}
              title="Project Preview"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals allow-same-origin"
              className="absolute inset-0 w-full h-full border-0 bg-white"
            />
          </div>
        </motion.div>
      </div>

      {/* Live URL dock in preview */}
      {liveDeployUrl ? (
        <div className="relative z-10 px-4 pb-2">
          <div className="flex flex-wrap items-center justify-center gap-2 py-2 px-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15">
            <span className="text-[11px] text-zinc-500">Deployed at</span>
            <a
              href={liveDeployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-cyan-300 hover:text-cyan-200 truncate max-w-[min(100%,320px)]"
            >
              {liveDeployUrl}
            </a>
            <button
              type="button"
              onClick={openDeployModal}
              className="text-[11px] text-violet-300 hover:text-violet-200 px-2 py-0.5 rounded-lg bg-violet-500/15 border border-violet-400/20"
            >
              Redeploy
            </button>
          </div>
        </div>
      ) : null}

      {/* Floating back-to-code hint */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
      >
        <button
          onClick={() => useIdeStore.getState().setViewMode("code")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full ula-glass border border-white/10 shadow-xl hover:border-cyan-400/30 transition-all hover:scale-105 text-sm text-zinc-300"
        >
          <Code2 size={16} className="text-cyan-400" />
          Back to Code
        </button>
      </motion.div>
    </motion.div>
  );
}
