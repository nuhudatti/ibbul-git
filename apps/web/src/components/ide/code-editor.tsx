"use client";

import { useEffect, useState } from "react";
import { CodeMirrorEditor } from "@/components/ide/code-editor-codemirror";
import { useIdeStore } from "@/store/ide-store";
import { getLanguageFromPath } from "@/lib/utils";

const MOBILE_REGEX = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry/i;

export function CodeEditor() {
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const files = useIdeStore((s) => s.files);
  const updateFileContent = useIdeStore((s) => s.updateFileContent);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const revisionEditUnlocked = useIdeStore((s) => s.revisionEditUnlocked);

  const readOnly = workspaceMode === "submitted" && !revisionEditUnlocked;
  console.log("[CodeEditor] readOnly decision", {
    workspaceMode,
    revisionEditUnlocked,
    readOnly,
    activeFilePath,
    filesCount: files.length,
  });
  const activeFile = files.find((f) => f.path === activeFilePath);
  const language = activeFile?.language ?? getLanguageFromPath(activeFilePath);
  const [clipboardSupported, setClipboardSupported] = useState(false);
  const [editorHandle, setEditorHandle] = useState<{
    selectAll?: () => void;
    paste?: (text: string) => void;
  } | null>(null);

  console.log("[CODE EDITOR RENDER]", {
    activeFilePath,
    filesCount: files.length,
    workspaceMode,
    revisionEditUnlocked,
    readOnly,
    hasActiveFile: !!activeFile,
    language,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setClipboardSupported(
      !!navigator.clipboard?.writeText && !!navigator.clipboard?.readText
    );
  }, []);

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Select a file to start coding
      </div>
    );
  }

  if (activeFile.language === "image") {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 bg-[#08080c] p-6 text-center">
        <div className="max-h-[min(70vh,520px)] max-w-full overflow-hidden rounded-xl border border-white/10 bg-black/30 p-2 shadow-2xl">
          <img
            src={activeFile.content}
            alt={activeFilePath}
            className="max-h-[min(62vh,460px)] max-w-full object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{activeFilePath}</p>
          <p className="mt-1 text-xs text-zinc-500">Imported workspace asset</p>
        </div>
      </div>
    );
  }

  const handleSelectAll = () => {
    editorHandle?.selectAll?.();
  };

  console.log("[CodeEditor] render", { activeFilePath, filesLength: files.length, readOnly, activeFile });

  const handleCopyAll = async () => {
    if (!activeFile?.content) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
    } catch {
      // ignore clipboard failures
    }
  };

  const handlePaste = async () => {
    if (!editorHandle?.paste || !navigator.clipboard?.readText) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editorHandle.paste(text);
      }
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <div className="flex-1 min-h-0 relative">
      {readOnly ? (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-[10px] text-emerald-300 font-medium">
          Read-only
        </div>
      ) : null}

      {!readOnly ? (
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-2 px-2 py-1 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10">
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-white/10"
            onClick={handleSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-white/10"
            onClick={handleCopyAll}
          >
            Copy
          </button>
          {clipboardSupported ? (
            <button
              type="button"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-white/10"
              onClick={handlePaste}
            >
              Paste
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="h-full min-h-0">
        <CodeMirrorEditor
          value={activeFile.content}
          language={language}
          readOnly={readOnly}
          onChange={(value) => {
            if (!readOnly) updateFileContent(activeFilePath, value);
          }}
          onMount={setEditorHandle}
        />
      </div>
    </div>
  );
}
