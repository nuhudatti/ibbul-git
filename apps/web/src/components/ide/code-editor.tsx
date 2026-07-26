"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIdeStore } from "@/store/ide-store";
import { getLanguageFromPath } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function CodeEditor() {
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const files = useIdeStore((s) => s.files);
  const updateFileContent = useIdeStore((s) => s.updateFileContent);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const editorRef = useRef<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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

  const handleSelectAll = () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.trigger) {
      editor.trigger("keyboard", "editor.action.selectAll", null);
    } else {
      const model = editor.getModel?.();
      if (!model) return;
      const fullRange = model.getFullModelRange();
      editor.setSelection(fullRange);
    }
    editor.focus();
  };

  const handleCopy = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.trigger) {
      editor.trigger("keyboard", "editor.action.clipboardCopyAction", null);
      setActionMessage("Copied to clipboard");
      return;
    }

    const model = editor.getModel?.();
    if (!model) return;
    const selection = editor.getSelection?.();
    const text = selection && !selection.isEmpty()
      ? model.getValueInRange(selection)
      : model.getValue();

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setActionMessage("Copied to clipboard");
    } catch {
      setActionMessage("Copy failed — use native selection");
    }
  };

  const handlePaste = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.trigger) {
      editor.trigger("keyboard", "editor.action.clipboardPasteAction", null);
      setActionMessage("Pasted clipboard text");
      editor.focus();
      return;
    }

    if (!navigator.clipboard?.readText) {
      setActionMessage("Paste not available");
      return;
    }

    const model = editor.getModel?.();
    if (!editor || !model) return;

    try {
      const pasteText = await navigator.clipboard.readText();
      if (!pasteText) return;
      const selection = editor.getSelection?.();
      editor.executeEdits("paste", [
        {
          range: selection ?? model.getFullModelRange(),
          text: pasteText,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
      setActionMessage("Pasted clipboard text");
    } catch {
      setActionMessage("Paste not available");
    }
  };

  useEffect(() => {
    if (!actionMessage) return;
    const timeout = window.setTimeout(() => setActionMessage(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

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
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        onChange={(value) => {
          if (!readOnly) updateFileContent(activeFilePath, value ?? "");
        }}
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
          scrollBeyondLastLine: false,
          padding: { top: 16 },
          lineNumbers: "on",
          renderLineHighlight: readOnly ? "none" : "all",
          renderWhitespace: "boundary",
          guides: { indentation: true },
          cursorBlinking: readOnly ? "solid" : "smooth",
          cursorSmoothCaretAnimation: readOnly ? "off" : "on",
          smoothScrolling: true,
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
          domReadOnly: readOnly,
          mouseWheelZoom: false,
          quickSuggestions: true,
          parameterHints: { enabled: true },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          formatOnPaste: true,
          formatOnType: true,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoSurround: "languageDefined",
          bracketPairColorization: { enabled: true },
          contextmenu: true,
          accessibilitySupport: "on",
          fixedOverflowWidgets: true,
          dragAndDrop: true,
          copyWithSyntaxHighlighting: true,
          largeFileOptimizations: false,
          folding: true,
          minimap: { enabled: true, renderCharacters: false, maxColumn: 80 },
        }}
      />

      <div className="mt-3 hidden flex-col gap-2 rounded-3xl border border-white/10 bg-[#08080c] p-3 sm:flex">
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={handleSelectAll} className="flex-1 justify-center">
            Select all
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopy} className="flex-1 justify-center">
            Copy
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePaste} className="flex-1 justify-center">
            Paste
          </Button>
        </div>
        {actionMessage ? <p className="text-xs text-zinc-400">{actionMessage}</p> : null}
      </div>

      <div className="mt-3 flex sm:hidden flex-col gap-2 rounded-3xl border border-white/10 bg-[#08080c] p-3">
        <div className="grid w-full grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" onClick={handleSelectAll} className="justify-center">
            All
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopy} className="justify-center">
            Copy
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePaste} className="justify-center">
            Paste
          </Button>
        </div>
        {actionMessage ? <p className="text-xs text-zinc-400">{actionMessage}</p> : null}
      </div>
    </div>
  );
}
