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

  isDeployModalOpen: boolean;
  openDeployModal: () => void;
  closeDeployModal: () => void;

  setActiveFile: (path: string) => void;
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
    opts?: { mode?: WorkspaceMode; submission?: SubmissionMeta | null; revisionUnlocked?: boolean }
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
  unlockRevisionEditing: () => void;
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
    console.log("loadProject CALLED", {
      name,
      assignmentId,
      mode,
      revisionUnlocked,
      filesLength: files.length,
      firstFilePath: files[0]?.path,
    });
    set({
      projectId: assignmentId ?? get().projectId,
      projectName: name,
      files: mapFiles(files),
      folders: [],
      activeFilePath: files[0]?.path ?? get().activeFilePath ?? "index.html",
      activeAssignmentId: assignmentId ?? null,
      workspaceMode: revisionUnlocked ? "edit" : mode,
      revisionEditUnlocked: revisionUnlocked,
      submissionMeta: opts?.submission ?? null,
      isDirty: false,
      previewKey: Date.now(),
      viewMode: revisionUnlocked || mode === "edit" ? "code" : "preview",
      isTerminalOpen: false,
      isExplorerOpen: revisionUnlocked || mode === "edit" ? true : get().isExplorerOpen,
      deployment: deployUrl
        ? {
            status: "success",
            url: deployUrl,
            progress: 100,
            logs: ["Live deployment ready"],
          }
        : defaultDeployment,
    });
    const state = get();
    console.log("loadProject COMPLETE", {
      workspaceMode: state.workspaceMode,
      revisionEditUnlocked: state.revisionEditUnlocked,
      isExplorerOpen: state.isExplorerOpen,
      viewMode: state.viewMode,
      activeFilePath: state.activeFilePath,
      filesCount: state.files.length,
      readOnly: state.isReadOnly(),
    });
  },
  unlockRevisionEditing: () => {
    console.log("unlockRevisionEditing CALLED");
    set({
      workspaceMode: "edit",
      revisionEditUnlocked: true,
      viewMode: "code",
      isExplorerOpen: true,
    });
    const state = get();
    console.log("unlockRevisionEditing COMPLETE", {
      workspaceMode: state.workspaceMode,
      viewMode: state.viewMode,
      isExplorerOpen: state.isExplorerOpen,
      readOnly: state.isReadOnly(),
    });
  },
  exitSubmittedView: () =>
    set((s) => ({
      workspaceMode: "edit",
      revisionEditUnlocked: true,
      submissionMeta: null,
      viewMode: "code",
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
    { name: "ula-ide" }
  )
);
