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

export function waitForHydrationState(
  hasHydrated: () => boolean,
  onFinishHydration: (callback: () => void) => (() => void) | undefined
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (hasHydrated()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = onFinishHydration(() => {
      unsubscribe?.();
      resolve();
    });
  });
}

export function waitForProjectHydration(): Promise<void> {
  return waitForHydrationState(
    () => useProjectStore.persist.hasHydrated(),
    (callback) => useProjectStore.persist.onFinishHydration(callback)
  );
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
        const ide = useIdeStore.getState();

        const snapshot: ProjectSnapshot = {
          assignmentId,
          studentMatric: normalizeMatric(matric),
          projectName,
          files: files.map((f) => ({ ...f })),
          folders: ide.folders,
          activeFilePath: ide.activeFilePath,
          openTabs: ide.openTabs,
          explorerState: { isOpen: ide.isExplorerOpen, expandedFolders: ide.expandedFolders },
          previewState: {
            viewMode: ide.viewMode,
            previewDevice: ide.previewDevice,
            previewKey: ide.previewKey,
            deployment: ide.deployment,
          },
          workspaceState: {
            folders: ide.folders,
            activeFilePath: ide.activeFilePath,
            openTabs: ide.openTabs,
            explorerState: { isOpen: ide.isExplorerOpen, expandedFolders: ide.expandedFolders },
            previewState: {
              viewMode: ide.viewMode,
              previewDevice: ide.previewDevice,
              previewKey: ide.previewKey,
              deployment: ide.deployment,
            },
            metadata: {
              workspaceMode: ide.workspaceMode,
              revisionEditUnlocked: ide.revisionEditUnlocked,
              revisionSessionAssignmentId: ide.revisionSessionAssignmentId,
              activeAssignmentId: ide.activeAssignmentId,
              saveStatus: ide.saveStatus,
              lastSaved: ide.lastSaved?.toISOString() ?? null,
            },
          },
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
        console.log("[ProjectStore] restoreSnapshot called", {
          matric: canonicalMatric,
          assignmentId,
          fallbackTitle,
          timestamp: new Date().toISOString(),
        });
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
          const ide = useIdeStore.getState();
          const alreadyRestored =
            ide.activeAssignmentId === assignmentId &&
            ide.workspaceMode === "edit" &&
            ide.revisionEditUnlocked &&
            ide.revisionSessionAssignmentId === assignmentId &&
            ide.files.length > 0;

          if (alreadyRestored) {
            console.log("[REVISION RESTORE] already restored in current session", {
              assignmentId,
              snapshotId: assignmentId,
              filesCount: ide.files.length,
              foldersCount: ide.folders.length,
              activeFile: ide.activeFilePath,
              openTabs: ide.openTabs,
              explorerState: { isOpen: ide.isExplorerOpen, expandedFolders: ide.expandedFolders },
              previewState: { viewMode: ide.viewMode, previewDevice: ide.previewDevice, previewKey: ide.previewKey },
              workspaceMode: ide.workspaceMode,
              revisionSession: ide.revisionSessionAssignmentId,
            });
            return;
          }

          console.log("[ProjectStore] waiting for project and ide hydration before restore");
          await Promise.all([waitForProjectHydration(), waitForIdeHydration()]);

          const snapshot = await get().loadSnapshot(canonicalMatric, assignmentId);
          console.log("[ProjectStore] snapshot loaded", {
            assignmentId,
            snapshotId: snapshot?.assignmentId,
            snapshotExists: !!snapshot,
            filesCount: snapshot?.files?.length ?? 0,
            filePaths: snapshot?.files?.slice(0, 10).map((file) => file.path) ?? [],
            projectName: snapshot?.projectName,
            submittedAt: snapshot?.submittedAt,
          });

          const restoredIde = useIdeStore.getState();
          const fallbackFiles =
            restoredIde.files?.length && restoredIde.activeAssignmentId === assignmentId ? restoredIde.files : [];
          const files = snapshot?.files?.length ? snapshot.files : fallbackFiles;
          const projectName =
            snapshot?.projectName ?? restoredIde.projectName ?? fallbackTitle ?? "Restored Project";

          console.log("[REVISION RESTORE]", {
            snapshotId: snapshot?.assignmentId ?? assignmentId,
            filesCount: files.length,
            foldersCount: snapshot?.folders?.length ?? 0,
            activeFile: snapshot?.activeFilePath ?? files[0]?.path ?? null,
            openTabs: snapshot?.openTabs ?? [files[0]?.path ?? null],
            explorerState: snapshot?.explorerState ?? snapshot?.workspaceState?.explorerState ?? null,
            previewState: snapshot?.previewState ?? snapshot?.workspaceState?.previewState ?? null,
            workspaceMode: "edit",
            revisionSession: assignmentId,
          });

          console.log("[ProjectStore] restoreSnapshot will load project", {
            assignmentId,
            hasSnapshot: !!snapshot,
            filesCount: files.length,
            filePaths: files.slice(0, 10).map((file) => file.path),
            projectName,
          });

          useIdeStore.getState().loadProject(projectName, files, assignmentId, {
            mode: "edit",
            revisionUnlocked: true,
            submission: null,
            workspaceState: {
              folders: snapshot?.folders?.length ? snapshot.folders : undefined,
              activeFilePath: snapshot?.activeFilePath ?? files[0]?.path,
              openTabs: snapshot?.openTabs?.length ? snapshot.openTabs : undefined,
              explorerState: snapshot?.explorerState ?? (snapshot?.workspaceState?.explorerState ?? undefined),
              previewState: snapshot?.previewState ?? (snapshot?.workspaceState?.previewState ?? undefined),
              metadata: snapshot?.workspaceState?.metadata ?? (snapshot?.metadata ?? undefined),
            },
          });

          console.log("[ProjectStore] restoreSnapshot calling beginRevisionSession", { assignmentId });
          useIdeStore.getState().beginRevisionSession(assignmentId);

          const state = useIdeStore.getState();
          if (files?.length && files[0]?.path) {
            state.setActiveFile(files[0].path);
          }
          state.setDirty(false);

          console.log("[REVISION READY]", {
            workspaceRestored: true,
            assignmentId,
            projectId: state.projectId,
            projectName: state.projectName,
            projectFilesCount: state.files.length,
            activeFile: state.activeFilePath,
            openTabs: state.openTabs,
            explorerState: { isOpen: state.isExplorerOpen, expandedFolders: state.expandedFolders },
            previewState: { viewMode: state.viewMode, previewDevice: state.previewDevice, previewKey: state.previewKey },
            workspaceMode: state.workspaceMode,
            revisionSession: state.revisionSessionAssignmentId,
          });

          console.log("[ProjectStore] restore complete", {
            assignmentId,
            projectId: state.projectId,
            projectName: state.projectName,
            projectFilesCount: state.files.length,
            activeFile: state.activeFilePath,
            workspaceMode: state.workspaceMode,
            viewMode: state.viewMode,
            isExplorerOpen: state.isExplorerOpen,
            revisionEditUnlocked: state.revisionEditUnlocked,
            isReadOnly: state.isReadOnly(),
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
