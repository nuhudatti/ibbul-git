"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileCode, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdeStore } from "@/store/ide-store";
import { getLanguageFromPath } from "@/lib/utils";

const FILE_ICONS: Record<string, string> = {
  html: "🌐",
  css: "🎨",
  javascript: "⚡",
  typescript: "📘",
  json: "📋",
  python: "🐍",
};

interface ExplorerNode {
  id: string;
  name: string;
  isFolder: boolean;
  path?: string;
  children?: ExplorerNode[];
}

function buildExplorerTree(files: { path: string }[]) {
  const nodes: Record<string, ExplorerNode> = {};
  const root: ExplorerNode[] = [];

  const getOrCreate = (key: string, name: string, isFolder: boolean): ExplorerNode => {
    if (!nodes[key]) {
      nodes[key] = { id: key, name, isFolder, children: isFolder ? [] : undefined };
    }
    return nodes[key];
  };

  for (const file of files) {
    const segments = file.path.split("/");
    let currentPath = "";
    let parent: ExplorerNode[] = root;

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFolder = i < segments.length - 1;
      const node = getOrCreate(currentPath, segment, isFolder);

      if (isFolder) {
        if (!node.children) node.children = [];
        if (!parent.some((item) => item.id === node.id)) parent.push(node);
        parent = node.children;
      } else {
        node.path = file.path;
        if (!parent.some((item) => item.id === node.id)) parent.push(node);
      }
    }
  }

  return root;
}

export function FileExplorer() {
  const files = useIdeStore((s) => s.files);
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const setActiveFile = useIdeStore((s) => s.setActiveFile);
  const isOpen = useIdeStore((s) => s.isExplorerOpen);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => buildExplorerTree(files), [files]);

  const toggleFolder = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderNode = (node: ExplorerNode, depth = 0) => {
    const indent = 12 + depth * 14;

    if (node.isFolder) {
      const isExpanded = !!expanded[node.id];
      return (
        <div key={node.id} className="space-y-1">
          <button
            type="button"
            onClick={() => toggleFolder(node.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            style={{ paddingLeft: indent }}
          >
            {isExpanded ? (
              <ChevronDown size={14} className="text-zinc-400" />
            ) : (
              <ChevronRight size={14} className="text-zinc-400" />
            )}
            <FolderOpen size={16} className="text-cyan-400" />
            <span className="truncate">{node.name}</span>
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && node.children?.length ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-1"
              >
                {node.children.map((child) => renderNode(child, depth + 1))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      );
    }

    const lang = node.path ? getLanguageFromPath(node.path) : "";
    const isActive = node.path === activeFilePath;

    return (
      <button
        key={node.id}
        type="button"
        onClick={() => node.path && setActiveFile(node.path)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm truncate transition-colors rounded-lg",
          isActive
            ? "bg-cyan-400/10 text-cyan-300 border-r-2 border-cyan-400"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
        )}
        style={{ paddingLeft: indent }}
      >
        <span className="text-xs">{FILE_ICONS[lang] ?? "📄"}</span>
        <FileCode size={14} className="opacity-70" />
        <span className="truncate">{node.name}</span>
        {isActive ? <ChevronRight size={12} className="ml-auto opacity-50" /> : null}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full w-full sm:w-72 lg:w-72 border-r border-white/6 bg-[#0a0a0f] flex flex-col overflow-hidden shrink-0"
        >
          <div className="h-10 flex items-center gap-2 px-3 border-b border-white/6 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <FolderOpen size={14} />
            Explorer
          </div>
          <div className="flex-1 overflow-y-auto ula-scrollbar py-2 px-1">
            <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
