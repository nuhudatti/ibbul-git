"use client";

import { motion } from "framer-motion";
import { Code2, Eye, Lock } from "lucide-react";
import { useIdeStore } from "@/store/ide-store";
import { cn } from "@/lib/utils";
import type { WorkspaceView } from "@/store/ide-store";

const TABS: { id: WorkspaceView; label: string; icon: typeof Code2 }[] = [
  { id: "code", label: "Code", icon: Code2 },
  { id: "preview", label: "Preview", icon: Eye },
];

export function ViewModeTabs() {
  const viewMode = useIdeStore((s) => s.viewMode);
  const setViewMode = useIdeStore((s) => s.setViewMode);
  const isDirty = useIdeStore((s) => s.isDirty);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const openPreview = useIdeStore((s) => s.openPreview);

  const handleTab = (id: WorkspaceView) => {
    if (id === "preview") openPreview();
    else setViewMode("code");
  };

  return (
    <div className="h-10 flex items-center px-3 gap-2 border-b border-white/6 bg-[#0a0a0f]">
      <div className="relative flex p-1 rounded-xl bg-white/4 border border-white/6">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = viewMode === id;
          return (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors z-10",
                active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {active ? (
                <motion.div
                  layoutId="view-tab-bg"
                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/20 to-violet-500/20 border border-cyan-400/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <Icon size={14} className="relative z-10" />
              <span className="relative z-10">{label}</span>
              {id === "preview" && viewMode === "preview" ? (
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-emerald-400 ula-pulse" />
              ) : null}
              {id === "preview" && viewMode === "code" && isDirty ? (
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-amber-400" title="Changes not previewed" />
              ) : null}
            </button>
          );
        })}
      </div>
      {workspaceMode === "submitted" ? (
        <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 flex items-center gap-1">
          <Lock size={10} /> Submission snapshot
        </span>
      ) : null}
    </div>
  );
}
