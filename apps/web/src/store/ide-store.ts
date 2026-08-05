"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProjectFile, AiMessage, DeploymentState } from "@/types";
import { STARTER_FILES } from "@/lib/mock-data";
import { getLanguageFromPath } from "@/lib/utils";

export type WorkspaceView = "code" | "preview";
export type PreviewDevice = "desktop" | "tablet" | "mobile";
export type WorkspaceMode = "edit" | "submitted";

export interface SubmissionMeta {
  submittedAt: string;
  score?: number;
  deployUrl?: string;
  assignmentTitle?: string;
}

interface IdeState {
  projectId: string;
  projectName: string;
  files: ProjectFile[];
  folders: string[];
  openTabs: string[];
  expandedFolders: string[];
  activeFilePath: string;
  isExplorerOpen: boolean;
  isAiPanelOpen: boolean;
  isTerminalOpen: boolean;
  terminalLogs: string[];
  aiMessages: AiMessage[];
  isAiThinking: boolean;
  deployment: DeploymentState;
  lastSaved: Date | null;
  saveStatus: "idle" | "saving" | "saved" | "failed";
  saveError: string | null;
  isDirty: boolean;

  viewMode: WorkspaceView;
  workspaceMode: WorkspaceMode;
  submissionMeta: SubmissionMeta | null;
  previewKey: number;
  previewDevice: PreviewDevice;
  activeAssignmentId: string | null;
  /** True when lecturer requested changes — overrides submitted/read-only lock */
  revisionEditUnlocked: boolean;
  /** Assignment id for an active revision editing session (survives persist rehydration) */
  revisionSessionAssignmentId: string | null;

  isDeployModalOpen: boolean;
  openDeployModal: () => void;
  closeDeployModal: () => void;

  setActiveFile: (path: string) => void;
  setExpandedFolders: (folders: string[]) => void;
  createFile: (path: string, content?: string) => boolean;
  createFolder: (path: string) => boolean;
  renamePath: (oldPath: string, newPath: string) => boolean;
  deleteFile: (path: string) => boolean;
  deleteFolder: (path: string) => boolean;
  importAsset: (path: string, content: string, language: string) => boolean;
  updateFileContent: (path: string, content: string) => void;
  toggleExplorer: () => void;
  toggleAiPanel: () => void;
  toggleTerminal: () => void;
  setViewMode: (mode: WorkspaceView) => void;
  openPreview: () => void;
  refreshPreview: () => void;
  setPreviewDevice: (device: PreviewDevice) => void;
  loadProject: (
    name: string,
    files: ProjectFile[],
    assignmentId?: string,
    opts?: {
      mode?: WorkspaceMode;
      submission?: SubmissionMeta | null;
      revisionUnlocked?: boolean;
      workspaceState?: {
        folders?: string[];
        activeFilePath?: string;
        openTabs?: string[];
        explorerState?: { isOpen?: boolean; expandedFolders?: string[] };
        previewState?: {
          viewMode?: WorkspaceView;
          previewDevice?: PreviewDevice;
          previewKey?: number;
          deployment?: DeploymentState;
        };
        metadata?: Record<string, unknown>;
      };
    }
  ) => void;
  exitSubmittedView: () => void;
  updateSubmissionMeta: (partial: Partial<SubmissionMeta>) => void;
  setLiveDeployUrl: (url: string) => void;
  resetWorkspaceSession: () => void;
  addTerminalLog: (log: string) => void;
  clearTerminal: () => void;
  addAiMessage: (message: Omit<AiMessage, "id" | "timestamp">) => void;
  setAiThinking: (thinking: boolean) => void;
  setDeployment: (deployment: Partial<DeploymentState>) => void;
  resetDeployment: () => void;
  markSaved: () => void;
  setDirty: (dirty: boolean) => void;
  isReadOnly: () => boolean;
  unlockRevisionEditing: (assignmentId?: string) => void;
  beginRevisionSession: (assignmentId: string) => void;
  endRevisionSession: () => void;
}

const defaultDeployment: DeploymentState = {
  status: "idle",
  logs: [],
  progress: 0,
};

function mapFiles(files: ProjectFile[]) {
  return files.map((f) => ({
    ...f,
    language: f.language ?? getLanguageFromPath(f.path),
  }));
}
function deriveFoldersFromFiles(files: ProjectFile[]) {
  const folders = new Set<string>();
  for (const file of files) {
    const segments = file.path.split("/").slice(0, -1);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (current) folders.add(current);
    }
  }
  return Array.from(folders).sort((a, b) => a.localeCompare(b));
}
function normalizeWorkspacePath(path: string) {
  return path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export const useIdeStore = create<IdeState>()(
  persist(
    (set, get) => ({
      projectId: "proj-demo-001",
      projectName: "My Dream Project",
      files: mapFiles(STARTER_FILES),
      folders: [],
      openTabs: ["index.html"],
      expandedFolders: [],
      activeFilePath: "index.html",
      isExplorerOpen: true,
      isAiPanelOpen: false,
      isTerminalOpen: false,
      viewMode: "code",
      workspaceMode: "edit",
      submissionMeta: null,
      previewKey: 0,
      previewDevice: "desktop",
      activeAssignmentId: null,
      revisionEditUnlocked: false,
      revisionSessionAssignmentId: null,
      isDeployModalOpen: false,
      terminalLogs: ["Project ULA ready.", "Press Run to launch your project in full preview."],
      aiMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: "Hey! I'm your AI coding mentor. Hit Run when you want to see your project come alive.",
          timestamp: new Date().toISOString(),
        },
      ],
      isAiThinking: false,
      deployment: defaultDeployment,
      lastSaved: null,
      saveStatus: "idle",
      saveError: null,
      isDirty: false,

      setActiveFile: (path) => set({ activeFilePath: path, viewMode: "code" }),
      setExpandedFolders: (folders) => set({ expandedFolders: folders }),
  createFile: (path, content = "") => {
    const normalized = normalizeWorkspacePath(path);
    if (!normalized || get().files.some((file) => file.path === normalized)) return false;
    set((state) => ({
      files: [...state.files, { path: normalized, content, language: getLanguageFromPath(normalized) }],
      activeFilePath: normalized,
      viewMode: "code",
      isDirty: true,
    }));
    return true;
  },
  createFolder: (path) => {
    const normalized = normalizeWorkspacePath(path);
    if (!normalized || get().folders.includes(normalized) || get().files.some((file) => file.path === normalized)) return false;
    set((state) => ({ folders: [...state.folders, normalized], isDirty: true }));
    return true;
  },
  renamePath: (oldPath, newPath) => {
    const nextPath = normalizeWorkspacePath(newPath);
    if (!nextPath || oldPath === nextPath) return false;
    const isFolder =
      get().folders.includes(oldPath) || get().files.some((file) => file.path.startsWith(`${oldPath}/`));
    const conflicts = isFolder
      ? get().files.some((file) => file.path === nextPath) || get().folders.some((folder) => folder === nextPath)
      : get().files.some((file) => file.path === nextPath) || get().folders.includes(nextPath);
    if (conflicts) return false;
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder === oldPath || folder.startsWith(`${oldPath}/`)
          ? `${nextPath}${folder.slice(oldPath.length)}`
          : folder
      ),
      files: state.files.map((file) =>
        file.path === oldPath || file.path.startsWith(`${oldPath}/`)
          ? { ...file, path: `${nextPath}${file.path.slice(oldPath.length)}`, language: getLanguageFromPath(`${nextPath}${file.path.slice(oldPath.length)}`) }
          : file
      ),
      activeFilePath:
        state.activeFilePath === oldPath || state.activeFilePath.startsWith(`${oldPath}/`)
          ? `${nextPath}${state.activeFilePath.slice(oldPath.length)}`
          : state.activeFilePath,
      isDirty: true,
    }));
    return true;
  },
  deleteFile: (path) => {
    if (!get().files.some((file) => file.path === path)) return false;
    set((state) => {
      const files = state.files.filter((file) => file.path !== path);
      return {
        files,
        activeFilePath: state.activeFilePath === path ? (files[0]?.path ?? "") : state.activeFilePath,
        isDirty: true,
      };
    });
    return true;
  },
  deleteFolder: (path) => {
    if (!get().folders.includes(path) && !get().files.some((file) => file.path.startsWith(`${path}/`))) return false;
    set((state) => {
      const files = state.files.filter((file) => !file.path.startsWith(`${path}/`));
      const folders = state.folders.filter((folder) => folder !== path && !folder.startsWith(`${path}/`));
      return {
        files,
        folders,
        activeFilePath:
          state.activeFilePath.startsWith(`${path}/`) ? (files[0]?.path ?? "") : state.activeFilePath,
        isDirty: true,
      };
    });
    return true;
  },
  importAsset: (path, content, language) => {
    const normalized = normalizeWorkspacePath(path);
    if (!normalized || get().files.some((file) => file.path === normalized) || get().folders.includes(normalized)) return false;
    set((state) => ({
      files: [...state.files, { path: normalized, content, language }],
      activeFilePath: normalized,
      viewMode: "code",
      isDirty: true,
    }));
    return true;
  },
  updateFileContent: (path, content) => {
    if (get().isReadOnly()) return;
    set((state) => ({
      files: state.files.map((f) => (f.path === path ? { ...f, content } : f)),
      isDirty: true,
    }));
  },
  toggleExplorer: () => set((s) => ({ isExplorerOpen: !s.isExplorerOpen })),
  toggleAiPanel: () => set((s) => ({ isAiPanelOpen: !s.isAiPanelOpen })),
  toggleTerminal: () => set((s) => ({ isTerminalOpen: !s.isTerminalOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  openPreview: () =>
    set((s) => ({
      viewMode: "preview",
      previewKey: s.previewKey + 1,
      isTerminalOpen: false,
    })),
  refreshPreview: () => set((s) => ({ previewKey: s.previewKey + 1 })),
  setPreviewDevice: (device) => set({ previewDevice: device }),
  openDeployModal: () => set({ isDeployModalOpen: true }),
  closeDeployModal: () => set({ isDeployModalOpen: false }),
  loadProject: (name, files, assignmentId, opts) => {
    const mode = opts?.mode ?? "edit";
    const deployUrl = opts?.submission?.deployUrl;
    const revisionUnlocked = mode === "edit" || Boolean(opts?.revisionUnlocked);
    const workspaceState = opts?.workspaceState;
    const derivedFolders = workspaceState?.folders?.length ? workspaceState.folders : deriveFoldersFromFiles(files);
    const derivedActiveFile = workspaceState?.activeFilePath ?? files[0]?.path ?? get().activeFilePath ?? "index.html";
    const derivedOpenTabs = workspaceState?.openTabs?.length ? workspaceState.openTabs : [derivedActiveFile];
    const derivedExpandedFolders = workspaceState?.explorerState?.expandedFolders?.length
      ? workspaceState.explorerState.expandedFolders
      : derivedFolders;
    const derivedExplorerOpen = workspaceState?.explorerState?.isOpen ?? true;
    const derivedViewMode = workspaceState?.previewState?.viewMode ?? (revisionUnlocked ? "code" : "preview");
    const derivedPreviewDevice = workspaceState?.previewState?.previewDevice ?? get().previewDevice;
    const derivedPreviewKey = workspaceState?.previewState?.previewKey ?? Date.now();
    const derivedDeployment = workspaceState?.previewState?.deployment ?? (deployUrl
      ? {
          status: "success",
          url: deployUrl,
          progress: 100,
          logs: ["Live deployment ready"],
        }
      : defaultDeployment);
    console.log("[LOAD PROJECT] called", {
      assignmentId,
      title: name,
      mode,
      revisionUnlocked,
    });
    console.log("loadProject CALLED", {
      name,
      assignmentId,
      mode,
      revisionUnlocked,
      revisionUnlockedOpt: opts?.revisionUnlocked,
      filesLength: files.length,
      firstFilePath: files[0]?.path,
      workspaceState,
    });
    console.log("[IdeStore] loadProject before apply", {
      assignmentId,
      mode,
      revisionUnlocked,
      incomingFilesCount: files.length,
      incomingFirstFile: files[0]?.path,
      currentWorkspaceMode: get().workspaceMode,
      currentRevisionUnlocked: get().revisionEditUnlocked,
      currentViewMode: get().viewMode,
      restoredFolders: derivedFolders.length,
      restoredOpenTabs: derivedOpenTabs.length,
    });
    set({
      projectId: assignmentId ?? get().projectId,
      projectName: name,
      files: mapFiles(files),
      folders: derivedFolders,
      openTabs: derivedOpenTabs,
      expandedFolders: derivedExpandedFolders,
      activeFilePath: derivedActiveFile,
      activeAssignmentId: assignmentId ?? null,
      workspaceMode: revisionUnlocked ? "edit" : mode,
      revisionEditUnlocked: revisionUnlocked,
      revisionSessionAssignmentId: revisionUnlocked
        ? (assignmentId ?? get().revisionSessionAssignmentId)
        : null,
      submissionMeta: opts?.submission ?? null,
      isDirty: false,
      previewKey: derivedPreviewKey,
      viewMode: derivedViewMode,
      previewDevice: derivedPreviewDevice,
      isTerminalOpen: false,
      isExplorerOpen: revisionUnlocked ? derivedExplorerOpen : get().isExplorerOpen,
      deployment: derivedDeployment,
    });
    console.log("[LOAD PROJECT] store after", {
      activeAssignmentId: get().activeAssignmentId,
      workspaceMode: get().workspaceMode,
      viewMode: get().viewMode,
    });
    const state = get();
    console.log("[IdeStore] loadProject complete", {
      assignmentId: state.activeAssignmentId,
      projectId: state.projectId,
      projectName: state.projectName,
      workspaceMode: state.workspaceMode,
      revisionEditUnlocked: state.revisionEditUnlocked,
      viewMode: state.viewMode,
      isExplorerOpen: state.isExplorerOpen,
      activeFilePath: state.activeFilePath,
      filesCount: state.files.length,
      isReadOnly: state.isReadOnly(),
    });
  },
  beginRevisionSession: (assignmentId) => {
    console.log("beginRevisionSession CALLED", { assignmentId });
    set({
      revisionSessionAssignmentId: assignmentId,
      activeAssignmentId: assignmentId,
      workspaceMode: "edit",
      revisionEditUnlocked: true,
      viewMode: "code",
      isExplorerOpen: true,
    });
    const state = get();
    console.log("beginRevisionSession COMPLETE", {
      revisionSessionAssignmentId: state.revisionSessionAssignmentId,
      workspaceMode: state.workspaceMode,
      readOnly: state.isReadOnly(),
    });
  },
  endRevisionSession: () =>
    set({
      revisionSessionAssignmentId: null,
      revisionEditUnlocked: false,
    }),
  unlockRevisionEditing: (assignmentId) => {
    const sessionId = assignmentId ?? get().revisionSessionAssignmentId ?? get().activeAssignmentId;
    console.log("unlockRevisionEditing CALLED", { assignmentId: sessionId });
    set({
      revisionSessionAssignmentId: sessionId,
      workspaceMode: "edit",
      revisionEditUnlocked: true,
      viewMode: "code",
      isExplorerOpen: true,
    });
    const state = get();
    console.log("unlockRevisionEditing COMPLETE", {
      revisionSessionAssignmentId: state.revisionSessionAssignmentId,
      workspaceMode: state.workspaceMode,
      viewMode: state.viewMode,
      isExplorerOpen: state.isExplorerOpen,
      readOnly: state.isReadOnly(),
    });
  },
  exitSubmittedView: () =>
    set((s) => ({
      // Dismiss snapshot banner without unlocking editing — only CHANGES_REQUESTED + restoreSnapshot may unlock
      submissionMeta: null,
      viewMode: "code",
      workspaceMode: "submitted",
      revisionEditUnlocked: false,
      revisionSessionAssignmentId: null,
      deployment: s.deployment.url
        ? {
            status: "success",
            url: s.deployment.url,
            progress: 100,
            logs: s.deployment.logs,
          }
        : defaultDeployment,
    })),
  updateSubmissionMeta: (partial) =>
    set((s) => ({
      submissionMeta: s.submissionMeta ? { ...s.submissionMeta, ...partial } : s.submissionMeta,
    })),
  setLiveDeployUrl: (url) =>
    set((s) => ({
      deployment: {
        status: "success",
        url,
        progress: 100,
        logs: [...(s.deployment.logs ?? []), "Live URL updated"],
      },
      submissionMeta: s.submissionMeta
        ? { ...s.submissionMeta, deployUrl: url }
        : s.submissionMeta,
    })),
  resetWorkspaceSession: () =>
    set({
      workspaceMode: "edit",
      revisionEditUnlocked: false,
      revisionSessionAssignmentId: null,
      submissionMeta: null,
      viewMode: "code",
      activeAssignmentId: null,
      projectName: "My Dream Project",
      files: mapFiles(STARTER_FILES),
      folders: [],
      activeFilePath: "index.html",
      isDirty: false,
      deployment: defaultDeployment,
      previewKey: Date.now(),
      isDeployModalOpen: false,
    }),
  addTerminalLog: (log) =>
    set((s) => ({
      terminalLogs: [...s.terminalLogs, `[${new Date().toLocaleTimeString()}] ${log}`],
    })),
  clearTerminal: () => set({ terminalLogs: [] }),
  addAiMessage: (message) =>
    set((s) => ({
      aiMessages: [
        ...s.aiMessages,
        { ...message, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ],
    })),
  setAiThinking: (thinking) => set({ isAiThinking: thinking }),
  setDeployment: (deployment) =>
    set((s) => ({ deployment: { ...s.deployment, ...deployment } })),
  resetDeployment: () => set({ deployment: defaultDeployment }),
  markSaved: () => set({ lastSaved: new Date(), isDirty: false, saveStatus: "saved", saveError: null }),
  setDirty: (dirty) => set({ isDirty: dirty, saveStatus: dirty ? "saving" : "saved" }),
  isReadOnly: () => get().workspaceMode === "submitted" && !get().revisionEditUnlocked,
    }),
    {
      name: "ula-ide",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<IdeState>;
        const c = current as IdeState;
        const merged = { ...c, ...p } as IdeState;

        const sessionId = c.revisionSessionAssignmentId ?? p.revisionSessionAssignmentId ?? null;
        const sessionActive =
          Boolean(sessionId) &&
          (c.revisionEditUnlocked ||
            p.revisionEditUnlocked ||
            (c.workspaceMode === "edit" && c.revisionEditUnlocked) ||
            (p.revisionEditUnlocked && p.workspaceMode === "edit"));

        // Never let stale persisted submitted state clobber an active revision session
        if (sessionActive && sessionId) {
          merged.revisionSessionAssignmentId = sessionId;
          merged.revisionEditUnlocked = true;
          merged.workspaceMode = "edit";
          merged.activeAssignmentId = sessionId;
          merged.viewMode = c.viewMode === "preview" && !c.revisionEditUnlocked ? p.viewMode ?? "code" : c.viewMode ?? "code";
          merged.isExplorerOpen = c.isExplorerOpen ?? true;
          if (c.files.length > 0 && c.activeAssignmentId === sessionId) {
            merged.files = c.files;
            merged.projectName = c.projectName;
            merged.activeFilePath = c.activeFilePath;
            merged.submissionMeta = c.submissionMeta ?? p.submissionMeta ?? null;
          }
        } else if (merged.workspaceMode === "submitted") {
          merged.revisionEditUnlocked = false;
          merged.revisionSessionAssignmentId = null;
        }

        console.log("[IdeStore] rehydrate merge", {
          persistedMode: p.workspaceMode,
          persistedUnlock: p.revisionEditUnlocked,
          persistedSession: p.revisionSessionAssignmentId,
          currentUnlock: c.revisionEditUnlocked,
          currentSession: c.revisionSessionAssignmentId,
          resultMode: merged.workspaceMode,
          resultUnlock: merged.revisionEditUnlocked,
          resultSession: merged.revisionSessionAssignmentId,
        });
        return merged;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("[IdeStore] rehydration failed", error);
          return;
        }
        console.log("[IdeStore] rehydration complete", {
          workspaceMode: state?.workspaceMode,
          revisionEditUnlocked: state?.revisionEditUnlocked,
          revisionSessionAssignmentId: state?.revisionSessionAssignmentId,
          activeAssignmentId: state?.activeAssignmentId,
          filesCount: state?.files?.length,
        });
      },
    }
  )
);

export function waitForIdeHydration(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (useIdeStore.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const unsub = useIdeStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
