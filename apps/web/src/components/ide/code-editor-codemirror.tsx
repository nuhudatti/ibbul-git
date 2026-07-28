"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { historyKeymap } from "@codemirror/history";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { lineNumbers, highlightActiveLineGutter } from "@codemirror/gutter";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { bracketMatching } from "@codemirror/matchbrackets";
import { closeBrackets } from "@codemirror/closebrackets";
import { indentOnInput, indentUnit } from "@codemirror/language";
import { foldGutter, foldKeymap } from "@codemirror/fold";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeMirrorEditorProps {
  value: string;
  language: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onMount: (handle: any) => void;
}

function getLanguageExtension(language: string, filePath?: string) {
  switch (language) {
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "markdown":
      return markdown();
    case "python":
      return python();
    case "javascript":
      return javascript({ jsx: filePath?.endsWith(".tsx") || filePath?.endsWith(".jsx") });
    case "typescript":
      return javascript({ jsx: filePath?.endsWith(".tsx") || filePath?.endsWith(".jsx"), typescript: true });
    default:
      return null;
  }
}

function getThemeExtension(darkMode: boolean) {
  if (darkMode) {
    return [oneDark];
  }

  return [
    EditorView.theme(
      {
        "&": {
          height: "100%",
          backgroundColor: "#f8fafc",
          color: "#111827",
        },
        ".cm-scroller": {
          fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
          fontSize: "14px",
          minHeight: "100%",
          padding: "16px 0 0 16px",
          outline: "none",
          touchAction: "manipulation",
          WebkitOverflowScrolling: "touch",
        },
        ".cm-content": {
          caretColor: "#0f172a",
        },
        ".cm-gutters": {
          backgroundColor: "#f8fafc",
          color: "#6b7280",
          borderRight: "1px solid #e5e7eb",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(14, 165, 233, 0.08)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "rgba(14, 165, 233, 0.08)",
        },
        ".cm-foldPlaceholder": {
          backgroundColor: "rgba(15, 23, 42, 0.04)",
          border: "1px solid #e5e7eb",
          borderRadius: "3px",
          padding: "0 4px",
        },
      },
      { dark: false }
    ),
  ];
}

export function CodeMirrorEditor({ value, language, readOnly, onChange, onMount }: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onMountRef = useRef(onMount);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onMountRef.current = onMount;
  }, [onMount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDarkMode(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const languageExtension = useMemo(() => getLanguageExtension(language), [language]);
  const themeExtension = useMemo(() => getThemeExtension(darkMode), [darkMode]);

  const extensions = useMemo(() => {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      foldGutter({ openText: "▾", closedText: "▸" }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...foldKeymap,
      ]),
      EditorState.tabSize.of(2),
      indentUnit.of("  "),
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      EditorView.lineWrapping,
      EditorView.theme(
        {
          "&": {
            height: "100%",
            fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
            fontSize: "14px",
            backgroundColor: darkMode ? "#0b1220" : "#f8fafc",
            color: darkMode ? "#e2e8f0" : "#111827",
          },
          ".cm-scroller": {
            minHeight: "100%",
            padding: "16px 0 0 16px",
            touchAction: "manipulation",
            WebkitOverflowScrolling: "touch",
          },
          ".cm-content": {
            caretColor: darkMode ? "#7c9eff" : "#0f172a",
          },
          ".cm-gutters": {
            backgroundColor: darkMode ? "#05070d" : "#f8fafc",
            color: darkMode ? "#6b7280" : "#6b7280",
            borderRight: darkMode ? "1px solid #1f2937" : "1px solid #e5e7eb",
          },
          ".cm-activeLine": {
            backgroundColor: darkMode ? "rgba(255,255,255,.05)" : "rgba(14, 165, 233, 0.08)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: darkMode ? "rgba(255,255,255,.05)" : "rgba(14, 165, 233, 0.08)",
          },
          ".cm-foldPlaceholder": {
            backgroundColor: darkMode ? "rgba(255,255,255,0.04)" : "rgba(15, 23, 42, 0.04)",
            border: darkMode ? "1px solid rgba(148, 163, 184, 0.25)" : "1px solid #e5e7eb",
            borderRadius: "3px",
            padding: "0 4px",
          },
        },
        { dark: darkMode }
      ),
      ...themeExtension,
      languageExtension ? languageExtension : [],
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ].flat();
  }, [darkMode, languageExtension, readOnly, themeExtension]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    onMountRef.current?.({
      type: "codemirror",
      focus: () => view.focus(),
      selectAll: () => {
        view.dispatch({
          selection: { anchor: 0, head: view.state.doc.length },
          scrollIntoView: true,
        });
      },
      getValue: () => view.state.doc.toString(),
      getSelection: () => {
        const selection = view.state.selection.main;
        return {
          isEmpty: selection.empty,
          text: view.state.doc.sliceString(selection.from, selection.to),
        };
      },
      paste: async (text: string) => {
        const selection = view.state.selection.main;
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: text },
          selection: { anchor: selection.from + text.length },
          scrollIntoView: true,
        });
      },
    });

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [containerRef.current, extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="min-h-0 flex-1" style={{ height: "100%" }} />;
}
