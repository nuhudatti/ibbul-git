"use client";

import dynamic from "next/dynamic";
import { useIdeStore } from "@/store/ide-store";
import { getLanguageFromPath } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function CodeEditor() {
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const files = useIdeStore((s) => s.files);
  const updateFileContent = useIdeStore((s) => s.updateFileContent);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);

  const readOnly = workspaceMode === "submitted";
  const activeFile = files.find((f) => f.path === activeFilePath);
  const language = activeFile?.language ?? getLanguageFromPath(activeFilePath);

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
          <img src={activeFile.content} alt={activeFilePath} className="max-h-[min(62vh,460px)] max-w-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{activeFilePath}</p>
          <p className="mt-1 text-xs text-zinc-500">Imported workspace asset</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      {readOnly ? (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-[10px] text-emerald-300 font-medium">
          Read-only
        </div>
      ) : null}
      <MonacoEditor
        height="100%"
        language={language}
        theme="vs-dark"
        value={activeFile.content}
        onChange={(value) => {
          if (!readOnly) updateFileContent(activeFilePath, value ?? "");
        }}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          lineNumbers: "on",
          renderLineHighlight: readOnly ? "none" : "all",
          cursorBlinking: readOnly ? "solid" : "smooth",
          smoothScrolling: true,
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
          domReadOnly: readOnly,
        }}
      />
    </div>
  );
}
