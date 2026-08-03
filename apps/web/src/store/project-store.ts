"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectFile, ProjectSnapshot } from "@/types";
import { normalizeMatric } from "@/lib/matric";
import { useIdeStore, waitForIdeHydration } from "./ide-store";

interface ProjectStoreState {
  snapshots: Record<string, ProjectSnapshot>;

  snapshotKey: (matric: string, assignmentId: string) => string;
  saveSnapshot: (
    matric: string,
    assignmentId: string,
    projectName: string,
    files: ProjectFile[],
    opts?: { submitted?: boolean; deployUrl?: string; score?: number }
  ) => ProjectSnapshot;
  getSnapshot: (matric: string, assignmentId: string) => ProjectSnapshot | undefined;
  getStudentSnapshots: (matric: string) => ProjectSnapshot[];
  loadSnapshot: (matric: string, assignmentId: string) => Promise<ProjectSnapshot | undefined>;
  restoreSnapshot: (matric: string, assignmentId: string, fallbackTitle?: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStoreState>()(
  persist(
    (set, get) => ({
      snapshots: {},

      snapshotKey: (matric, assignmentId) =>
        `${normalizeMatric(matric)}:${assignmentId}`,

      saveSnapshot: (matric, assignmentId, projectName, files, opts) => {
        const key = get().snapshotKey(matric, assignmentId);
        const existing = get().snapshots[key];
        const now = new Date().toISOString();

        const snapshot: ProjectSnapshot = {
          assignmentId,
          studentMatric: normalizeMatric(matric),
          projectName,
          files: files.map((f) => ({ ...f })),
          savedAt: now,
          submittedAt: opts?.submitted ? now : existing?.submittedAt,
          deployUrl: opts?.deployUrl ?? existing?.deployUrl,
          score: opts?.score ?? existing?.score,
        };

        set((s) => ({
          snapshots: { ...s.snapshots, [key]: snapshot },
        }));

        return snapshot;
      },

      getSnapshot: (matric, assignmentId) => {
        const key = get().snapshotKey(matric, assignmentId);
        const legacy = `${matric.toLowerCase().trim()}:${assignmentId}`;
        return get().snapshots[key] ?? get().snapshots[legacy];
      },

      getStudentSnapshots: (matric) => {
        const prefix = `${normalizeMatric(matric)}:`;
        return Object.entries(get().snapshots)
          .filter(([k]) => k.startsWith(prefix))
          .map(([, v]) => v)
          .sort(
            (a, b) =>
              new Date(b.submittedAt ?? b.savedAt).getTime() -
              new Date(a.submittedAt ?? a.savedAt).getTime()
          );
      },

      loadSnapshot: async (matric, assignmentId) => {
        console.log("[ProjectStore] loadSnapshot start", { matric, assignmentId });
        if (!matric || !assignmentId) {
          console.warn("[ProjectStore] loadSnapshot: missing matric or assignmentId");
          return undefined;
        }
        
        const key = get().snapshotKey(matric, assignmentId);
        const legacyKey = `${matric.toLowerCase().trim()}:${assignmentId}`;
        let snapshot = get().snapshots[key] ?? get().snapshots[legacyKey];
        console.log("[ProjectStore] local snapshot found", { key, hasLocal: !!snapshot, snapshot });

        try {
          const res = await fetch(
            `/api/project-snapshots?matricNumber=${encodeURIComponent(matric)}&assignmentId=${encodeURIComponent(
              assignmentId
            )}`
          );
          console.log("[ProjectStore] loadSnapshot fetch status", res.status);
          
          if (res.ok) {
            const data = await res.json();
            console.log("[ProjectStore] loadSnapshot fetch data", { snapshotExists: !!data?.snapshot });
            if (data?.snapshot) {
              snapshot = data.snapshot;
              set((s) => ({ snapshots: { ...s.snapshots, [key]: snapshot } }));
              console.log("[ProjectStore] server snapshot loaded and cached", { snapshotId: snapshot.assignmentId });
            }
          } else if (res.status === 404) {
            console.log("[ProjectStore] loadSnapshot: no snapshot found on server (404) - using local snapshot if available");
            // 404 is expected if student hasn't submitted yet - don't treat as error
          } else {
            const errorText = await res.text().catch(() => "");
            console.warn("[ProjectStore] loadSnapshot server error", { status: res.status, error: errorText.substring(0, 200) });
          }
        } catch (error) {
          console.error("[ProjectStore] loadSnapshot fetch failed", error);
          // Don't throw - we'll use local snapshot or return undefined
        }

        console.log("[ProjectStore] loadSnapshot returning", { 
          snapshotId: snapshot?.assignmentId,
          filesCount: snapshot?.files?.length,
          snapshot: !!snapshot
        });
        return snapshot;
      },

      restoreSnapshot: async (matric, assignmentId, fallbackTitle) => {
        const canonicalMatric = normalizeMatric(matric);
        console.log("RESTORE STARTED", {
          matric: canonicalMatric,
          assignmentId,
          fallbackTitle,
          timestamp: new Date().toISOString(),
        });

        if (!canonicalMatric || !assignmentId) {
          console.error("[PROJECT STORE] ERROR: Missing matric or assignmentId");
          return;
        }

        try {
          await waitForIdeHydration();

          const snapshot = await get().loadSnapshot(canonicalMatric, assignmentId);
          console.log("SNAPSHOT LOADED", {
            snapshotId: snapshot?.assignmentId,
            filesCount: snapshot?.files?.length ?? 0,
            projectName: snapshot?.projectName,
            submittedAt: snapshot?.submittedAt,
          });

          const ide = useIdeStore.getState();
          const fallbackFiles =
            ide.files?.length && ide.activeAssignmentId === assignmentId ? ide.files : [];
          const files = snapshot?.files?.length ? snapshot.files : fallbackFiles;
          const projectName =
            snapshot?.projectName ?? ide.projectName ?? fallbackTitle ?? "Restored Project";

          useIdeStore.getState().loadProject(projectName, files, assignmentId, {
            mode: "edit",
            revisionUnlocked: true,
            submission: {
              submittedAt:
                snapshot?.submittedAt ??
                ide.submissionMeta?.submittedAt ??
                new Date().toISOString(),
              score: snapshot?.score ?? ide.submissionMeta?.score,
              deployUrl: snapshot?.deployUrl ?? ide.submissionMeta?.deployUrl,
              assignmentTitle: fallbackTitle ?? ide.submissionMeta?.assignmentTitle,
            },
          });

          useIdeStore.getState().beginRevisionSession(assignmentId);

          const state = useIdeStore.getState();
          if (files?.length && files[0]?.path) {
            state.setActiveFile(files[0].path);
          }
          state.setDirty(false);

          console.log("RESTORE COMPLETE", {
            workspaceMode: state.workspaceMode,
            viewMode: state.viewMode,
            activeFile: state.activeFilePath,
            filesCount: state.files.length,
            isExplorerOpen: state.isExplorerOpen,
            readOnly: state.isReadOnly(),
            activeAssignmentId: state.activeAssignmentId,
          });
        } catch (error) {
          console.error("[PROJECT STORE] ERROR in restoreSnapshot:", error);
          throw error;
        }
      },
    }),
    { name: "ula-projects" }
  )
);
