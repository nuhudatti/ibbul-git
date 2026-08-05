"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  ImagePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn, getLanguageFromPath, resolveCreationPath } from "@/lib/utils";
import { useIdeStore } from "@/store/ide-store";

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

function starterContent(extension: string) {
  if (extension === "html") return "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>New page</title>\n  </head>\n  <body>\n    \n  </body>\n</html>\n";
  if (extension === "css") return "/* Start styling here */\n";
  if (["js", "jsx", "ts", "tsx"].includes(extension)) return "// Start building here\n";
  if (extension === "json") return "{}\n";
  return "# New file\n";
}

interface ExplorerInput {
  path: string;
  isFolder?: boolean;
}

function buildExplorerTree(files: ExplorerInput[], folders: string[]) {
  const nodes: Record<string, ExplorerNode> = {};
  const root: ExplorerNode[] = [];

  const getOrCreate = (key: string, name: string, isFolder: boolean): ExplorerNode => {
    if (!nodes[key]) {
      nodes[key] = { id: key, name, isFolder, children: isFolder ? [] : undefined };
    }
    return nodes[key];
  };

  for (const file of [...folders.map((path) => ({ path, isFolder: true })), ...files]) {
    const segments = file.path.split("/");
    let currentPath = "";
    let parent: ExplorerNode[] = root;

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFolder = file.isFolder || i < segments.length - 1;
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
  const folders = useIdeStore((s) => s.folders);
  const expandedFolders = useIdeStore((s) => s.expandedFolders);
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const setActiveFile = useIdeStore((s) => s.setActiveFile);
  const setExpandedFolders = useIdeStore((s) => s.setExpandedFolders);
  const createFile = useIdeStore((s) => s.createFile);
  const createFolder = useIdeStore((s) => s.createFolder);
  const renamePath = useIdeStore((s) => s.renamePath);
  const deleteFile = useIdeStore((s) => s.deleteFile);
  const deleteFolder = useIdeStore((s) => s.deleteFolder);
  const importAsset = useIdeStore((s) => s.importAsset);
  const toggleExplorer = useIdeStore((s) => s.toggleExplorer);
  const isOpen = useIdeStore((s) => s.isExplorerOpen);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const expanded = useMemo(() => Object.fromEntries(expandedFolders.map((folder) => [folder, true])), [expandedFolders]);
  const uploadRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => buildExplorerTree(files, folders), [files, folders]);

  const notify = (message: string) => window.alert(message);

  const handleNewFile = () => {
    const name = window.prompt("New file path", "index.html");
    if (!name) return;
    const resolvedPath = resolveCreationPath(name, selectedFolderPath);
    const extension = resolvedPath.split(".").pop()?.toLowerCase();
    if (!extension || !["html", "css", "js", "jsx", "ts", "tsx", "json", "md"].includes(extension)) {
      notify("Use a supported file extension: .html, .css, .js, .jsx, .ts, .tsx, .json, or .md.");
      return;
    }
    if (!createFile(resolvedPath, starterContent(extension))) notify("A file with that path already exists.");
  };

  const handleNewFolder = () => {
    const name = window.prompt("New folder path", "assets");
    if (!name) return;
    const resolvedPath = resolveCreationPath(name, selectedFolderPath);
    if (!createFolder(resolvedPath)) notify("That folder already exists or the path is invalid.");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("Images must be 5MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const path = resolveCreationPath(file.name.replace(/[^a-zA-Z0-9._-]/g, "-"), selectedFolderPath ?? "assets");
      if (!importAsset(path, String(reader.result), "image")) notify("An asset with that name already exists.");
    };
    reader.readAsDataURL(file);
  };

  const handleRename = (path: string) => {
    const nextPath = window.prompt("Rename path", path);
    if (nextPath && !renamePath(path, nextPath)) notify("That path is invalid or already exists.");
  };

  const toggleFolder = (id: string) => {
    const next = expandedFolders.includes(id)
      ? expandedFolders.filter((folder) => folder !== id)
      : [...expandedFolders, id];
    setExpandedFolders(next);
  };

  const renderNode = (node: ExplorerNode, depth = 0) => {
    const indent = 12 + depth * 14;

    if (node.isFolder) {
      const isExpanded = !!expanded[node.id];
      return (
        <div key={node.id} className="space-y-1">
          <div className="group flex items-center gap-1 rounded-lg hover:bg-white/5">
            <button
              type="button"
              onClick={() => {
                toggleFolder(node.id);
                setSelectedFolderPath(node.id);
              }}
              className="min-w-0 flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              style={{ paddingLeft: indent }}
            >
              {isExpanded ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
              {isExpanded ? <FolderOpen size={16} className="text-cyan-400" /> : <Folder size={16} className="text-cyan-400" />}
              <span className="truncate">{node.name}</span>
            </button>
            {node.isFolder ? (
              <button type="button" onClick={() => handleRename(node.id)} className="inline-flex lg:hidden lg:group-hover:inline-flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-white" title="Rename folder">
                <Pencil size={13} />
              </button>
            ) : null}
            {node.isFolder ? (
              <button type="button" onClick={() => window.confirm(`Delete folder ${node.id} and its files?`) && deleteFolder(node.id)} className="inline-flex lg:hidden lg:group-hover:inline-flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-red-300" title="Delete folder">
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>

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
      <div key={node.id} className={cn("group flex items-center gap-1 rounded-lg", isActive ? "bg-cyan-400/10 border-r-2 border-cyan-400" : "hover:bg-white/5")}>
        <button
          type="button"
          onClick={() => {
            if (!node.path) return;
            setActiveFile(node.path);
            const parentFolder = node.path.split("/").slice(0, -1).join("/");
            setSelectedFolderPath(parentFolder || null);
            if (window.matchMedia("(max-width: 1023px)").matches) toggleExplorer();
          }}
          className={cn("min-w-0 flex-1 flex items-center gap-2 px-3 py-2 text-sm truncate transition-colors", isActive ? "text-cyan-300" : "text-zinc-400 hover:text-zinc-200")}
          style={{ paddingLeft: indent }}
        >
          <span className="text-xs">{FILE_ICONS[lang] ?? (lang === "plaintext" ? "📄" : "🖼️")}</span>
          <FileCode size={14} className="opacity-70" />
          <span className="truncate">{node.name}</span>
          {isActive ? <ChevronRight size={12} className="ml-auto opacity-50" /> : null}
        </button>
        <button type="button" onClick={() => node.path && handleRename(node.path)} className="inline-flex lg:hidden lg:group-hover:inline-flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-white" title="Rename file">
          <Pencil size={13} />
        </button>
        <button type="button" onClick={() => node.path && window.confirm(`Delete ${node.path}?`) && deleteFile(node.path)} className="inline-flex lg:hidden lg:group-hover:inline-flex h-7 w-7 items-center justify-center text-zinc-500 hover:text-red-300" title="Delete file">
          <Trash2 size={13} />
        </button>
      </div>
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
          className="h-full w-full lg:w-72 border-r border-white/6 bg-[#0a0a0f] flex flex-col overflow-hidden shrink-0"
        >
          <div className="h-10 flex items-center gap-2 px-3 border-b border-white/6 text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <FolderOpen size={14} />
            <span className="flex-1">Explorer</span>
            <input ref={uploadRef} type="file" accept="image/*" onChange={handleImport} className="hidden" />
            <button type="button" onClick={handleNewFile} title="New file" className="text-zinc-500 hover:text-cyan-300"><FilePlus2 size={15} /></button>
            <button type="button" onClick={handleNewFolder} title="New folder" className="text-zinc-500 hover:text-cyan-300"><FolderPlus size={15} /></button>
            <button type="button" onClick={() => uploadRef.current?.click()} title="Import image" className="text-zinc-500 hover:text-cyan-300"><ImagePlus size={15} /></button>
          </div>
          <div className="flex-1 overflow-y-auto ula-scrollbar py-2 px-1">
            <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
