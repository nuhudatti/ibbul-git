"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileExplorer } from "@/components/ide/file-explorer";
import { CodeEditor } from "@/components/ide/code-editor";
import { PreviewStage } from "@/components/ide/preview-stage";
import { ViewModeTabs } from "@/components/ide/view-mode-tabs";
import { AiPanel } from "@/components/ide/ai-panel";
import { TerminalPanel } from "@/components/ide/terminal-panel";
import { IdeTopBar } from "@/components/ide/ide-top-bar";
import { SubmittedBanner } from "@/components/student/submitted-banner";
import { AssignmentsPanel } from "@/components/student/assignments-panel";
import { PortfolioIdentityStrip } from "@/components/portfolio/portfolio-identity-strip";
import { useAuthStore } from "@/store/auth-store";
import { useIdeStore } from "@/store/ide-store";
import { useProjectStore } from "@/store/project-store";

export default function WorkspacePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const viewMode = useIdeStore((s) => s.viewMode);
  const files = useIdeStore((s) => s.files);
  const refreshPreview = useIdeStore((s) => s.refreshPreview);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "STUDENT") {
      router.replace("/");
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/workspace/change-password");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useIdeStore.getState();
      if (state.isDirty && state.workspaceMode === "edit") {
        state.markSaved();
        const u = useAuthStore.getState().user;
        if (u && state.activeAssignmentId) {
          useProjectStore
            .getState()
            .saveSnapshot(
              u.matricNumber,
              state.activeAssignmentId,
              state.projectName,
              state.files
            );
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync preview while in preview mode
  useEffect(() => {
    if (viewMode !== "preview") return;
    const t = setTimeout(() => refreshPreview(), 500);
    return () => clearTimeout(t);
  }, [files, viewMode, refreshPreview]);

  if (!isAuthenticated || user?.role !== "STUDENT") return null;

  return (
    <div className="h-[100dvh] min-h-screen flex flex-col bg-[#050508] overflow-hidden">
      <IdeTopBar />
      <PortfolioIdentityStrip />
      <SubmittedBanner />
      <AssignmentsPanel />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex-1 flex flex-col min-h-0 lg:flex-row">
          {viewMode === "code" ? <FileExplorer /> : null}

          <main className="flex flex-col min-w-0 flex-1 min-h-0">
            <ViewModeTabs />

            <div className="flex-1 flex flex-col min-h-0 relative">
              <AnimatePresence mode="wait">
                {viewMode === "code" ? (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                    className="flex-1 min-h-0 flex flex-col"
                  >
                    <CodeEditor />
                  </motion.div>
                ) : (
                  <PreviewStage key="preview" />
                )}
              </AnimatePresence>
            </div>

            {viewMode === "code" ? <TerminalPanel /> : null}
          </main>

          {viewMode === "code" ? <AiPanel /> : null}
        </div>
      </motion.div>
    </div>
  );
}
