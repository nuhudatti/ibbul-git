"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectFile, ProjectSnapshot } from "@/types";
import { normalizeMatric } from "@/lib/matric";
import { useIdeStore } from "./ide-store";

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
        if (!matric || !assignmentId) return undefined;
        const key = get().snapshotKey(matric, assignmentId);
        const legacyKey = `${matric.toLowerCase().trim()}:${assignmentId}`;
        let snapshot = get().snapshots[key] ?? get().snapshots[legacyKey];

        try {
          const res = await fetch(
            `/api/project-snapshots?matricNumber=${encodeURIComponent(matric)}&assignmentId=${encodeURIComponent(
              assignmentId
            )}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.snapshot) {
              snapshot = data.snapshot;
              set((s) => ({ snapshots: { ...s.snapshots, [key]: snapshot } }));
            }
          }
        } catch {
          // ignore network issues and fallback to local snapshot
        }

        return snapshot;
      },

      restoreSnapshot: async (matric, assignmentId, fallbackTitle) => {
        if (!matric || !assignmentId) return;
        const snapshot = await get().loadSnapshot(matric, assignmentId);

        const ide = useIdeStore.getState();
        const fallbackFiles = ide.files?.length && ide.activeAssignmentId === assignmentId ? ide.files : [];
        const files = snapshot?.files?.length ? snapshot.files : fallbackFiles;
        const projectName = snapshot?.projectName ?? ide.projectName ?? fallbackTitle ?? "Restored Project";

        useIdeStore.getState().loadProject(projectName, files, assignmentId, {
          mode: "edit",
          submission: {
            submittedAt: snapshot?.submittedAt ?? ide.submissionMeta?.submittedAt ?? new Date().toISOString(),
            score: snapshot?.score ?? ide.submissionMeta?.score,
            deployUrl: snapshot?.deployUrl ?? ide.submissionMeta?.deployUrl,
            assignmentTitle: fallbackTitle ?? ide.submissionMeta?.assignmentTitle,
          },
        });

        const state = useIdeStore.getState();
        if (!state.isExplorerOpen) state.toggleExplorer();
        if (state.viewMode !== "code") state.setViewMode("code");
        if (files?.length && files[0]?.path) state.setActiveFile(files[0].path);
        state.setDirty(false);
      },
    }),
    { name: "ula-projects" }
  )
);
