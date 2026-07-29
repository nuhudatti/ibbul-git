"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine } from "@codemirror/view";
import { highlightSelectionMatches } from "@codemirror/search";
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
import { foldGutter } from "@codemirror/fold";
import { HighlightStyle, tags } from "@codemirror/highlight";

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

const lightEditorTheme = HighlightStyle.define([
  { tag: tags.keyword, color: "#0000ff" },
  { tag: [tags.name, tags.deleted, tags.propertyName, tags.macroName], color: "#001080" },
  { tag: [tags.function(tags.propertyName), tags.labelName], color: "#795e26" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#001080" },
  { tag: [tags.definition(tags.name), tags.separator], color: "#001080" },
  { tag: [tags.typeName, tags.className], color: "#267f99" },
  { tag: [tags.string, tags.special(tags.string)], color: "#a31515" },
  { tag: [tags.number, tags.changed, tags.annotation, tags.modifier], color: "#098658" },
  { tag: [tags.comment, tags.docComment], color: "#008000", fontStyle: "italic" },
  { tag: tags.invalid, color: "#ff0000", textDecoration: "underline" },
  { tag: [tags.operator, tags.punctuation], color: "#000000" },
  { tag: [tags.variableName, tags.namespace], color: "#001080" },
  { tag: [tags.meta, tags.processingInstruction], color: "#0451a5" },
  { tag: [tags.link, tags.escape], color: "#0451a5" },
]);

const darkEditorTheme = HighlightStyle.define([
  { tag: tags.keyword, color: "#569cd6" },
  { tag: [tags.name, tags.deleted, tags.propertyName, tags.macroName], color: "#9cdcfe" },
  { tag: [tags.function(tags.propertyName), tags.labelName], color: "#dcdcaa" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#4ec9b0" },
  { tag: [tags.definition(tags.name), tags.separator], color: "#d4d4d4" },
  { tag: [tags.typeName, tags.className], color: "#4ec9b0" },
  { tag: [tags.string, tags.special(tags.string)], color: "#ce9178" },
  { tag: [tags.number, tags.changed, tags.annotation, tags.modifier], color: "#b5cea8" },
  { tag: [tags.comment, tags.docComment], color: "#6a9955", fontStyle: "italic" },
  { tag: tags.invalid, color: "#f44747", textDecoration: "underline" },
  { tag: [tags.operator, tags.punctuation], color: "#d4d4d4" },
  { tag: [tags.variableName, tags.namespace], color: "#9cdcfe" },
  { tag: [tags.meta, tags.processingInstruction], color: "#9cdcfe" },
  { tag: [tags.link, tags.escape], color: "#4fc1ff" },
]);

function getThemeExtension(darkMode: boolean) {
  if (darkMode) {
    return [
      EditorView.theme(
        {
          "&": {
            height: "100%",
            backgroundColor: "#1e1e1e",
            color: "#d4d4d4",
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
            caretColor: "#aeafad",
          },
          ".cm-gutters": {
            backgroundColor: "#252526",
            color: "#858585",
            borderRight: "1px solid #333333",
          },
          ".cm-activeLine": {
            backgroundColor: "rgba(255,255,255,0.06)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: "rgba(255,255,255,0.06)",
          },
          ".cm-foldPlaceholder": {
            backgroundColor: "rgba(128, 128, 128, 0.14)",
            border: "1px solid rgba(128, 128, 128, 0.25)",
            borderRadius: "3px",
            padding: "0 4px",
          },
          ".cm-matchingBracket, .cm-nonmatchingBracket": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            outline: "1px solid rgba(255, 255, 255, 0.15)",
          },
          ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
            backgroundColor: "rgba(95, 148, 255, 0.3)",
          },
          ".cm-tooltip": {
            backgroundColor: "#252526",
            color: "#d4d4d4",
            border: "1px solid #454545",
          },
          ".cm-tooltip .cm-tooltip-arrow:before": {
            borderTopColor: "#252526",
          },
        },
        { dark: true }
      ),
      darkEditorTheme,
    ];
  }

  return [
    EditorView.theme(
      {
        "&": {
          height: "100%",
          backgroundColor: "#fffffe",
          color: "#24292f",
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
          caretColor: "#24292f",
        },
        ".cm-gutters": {
          backgroundColor: "#f3f3f3",
          color: "#6b7280",
          borderRight: "1px solid #e1e4e8",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(195, 224, 255, 0.4)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "rgba(195, 224, 255, 0.4)",
        },
        ".cm-foldPlaceholder": {
          backgroundColor: "rgba(27, 31, 35, 0.05)",
          border: "1px solid rgba(27, 31, 35, 0.08)",
          borderRadius: "3px",
          padding: "0 4px",
        },
        ".cm-matchingBracket, .cm-nonmatchingBracket": {
          backgroundColor: "rgba(181, 211, 255, 0.5)",
          outline: "1px solid rgba(56, 139, 253, 0.4)",
        },
        ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
          backgroundColor: "rgba(181, 211, 255, 0.5)",
        },
        ".cm-tooltip": {
          backgroundColor: "#ffffff",
          color: "#24292f",
          border: "1px solid #d1d5da",
        },
        ".cm-tooltip .cm-tooltip-arrow:before": {
          borderTopColor: "#ffffff",
        },
      },
      { dark: false }
    ),
    lightEditorTheme,
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
            backgroundColor: darkMode ? "#1e1e1e" : "#fffffe",
            color: darkMode ? "#d4d4d4" : "#24292f",
          },
          ".cm-scroller": {
            minHeight: "100%",
            padding: "16px 0 0 16px",
            touchAction: "manipulation",
            WebkitOverflowScrolling: "touch",
          },
          ".cm-content": {
            caretColor: darkMode ? "#aeafad" : "#24292f",
          },
          ".cm-gutters": {
            backgroundColor: darkMode ? "#252526" : "#f3f3f3",
            color: darkMode ? "#858585" : "#6b7280",
            borderRight: darkMode ? "1px solid #333333" : "1px solid #e1e4e8",
          },
          ".cm-activeLine": {
            backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(195, 224, 255, 0.4)",
          },
          ".cm-activeLineGutter": {
            backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(195, 224, 255, 0.4)",
          },
          ".cm-foldPlaceholder": {
            backgroundColor: darkMode ? "rgba(128, 128, 128, 0.14)" : "rgba(27, 31, 35, 0.05)",
            border: darkMode ? "1px solid rgba(128, 128, 128, 0.25)" : "1px solid rgba(27, 31, 35, 0.08)",
            borderRadius: "3px",
            padding: "0 4px",
          },
          ".cm-matchingBracket, .cm-nonmatchingBracket": {
            backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(181, 211, 255, 0.5)",
            outline: darkMode ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(56, 139, 253, 0.4)",
          },
          ".cm-selectionBackground, .cm-focused .cm-selectionBackground": {
            backgroundColor: darkMode ? "rgba(95, 148, 255, 0.3)" : "rgba(181, 211, 255, 0.5)",
          },
          ".cm-tooltip": {
            backgroundColor: darkMode ? "#252526" : "#ffffff",
            color: darkMode ? "#d4d4d4" : "#24292f",
            border: darkMode ? "1px solid #454545" : "1px solid #d1d5da",
          },
          ".cm-tooltip .cm-tooltip-arrow:before": {
            borderTopColor: darkMode ? "#252526" : "#ffffff",
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
