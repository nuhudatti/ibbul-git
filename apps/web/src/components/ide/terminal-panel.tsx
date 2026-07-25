"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon, X } from "lucide-react";
import { useIdeStore } from "@/store/ide-store";

export function TerminalPanel() {
  const isOpen = useIdeStore((s) => s.isTerminalOpen);
  const logs = useIdeStore((s) => s.terminalLogs);
  const toggleTerminal = useIdeStore((s) => s.toggleTerminal);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 240 }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-0 z-50 sm:relative sm:inset-auto sm:h-[180px] border-t border-white/6 bg-[#08080c] overflow-hidden shrink-0"
        >
          <div className="h-10 flex items-center justify-between px-3 border-b border-white/6">
            <div className="flex items-center gap-2 text-sm text-zinc-200">
              <TerminalIcon size={16} />
              <span>Terminal</span>
            </div>
            <button
              onClick={toggleTerminal}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Close terminal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="h-[calc(100%-40px)] overflow-y-auto ula-scrollbar p-3 font-mono text-[12px] text-zinc-300 space-y-1">
            {logs.length === 0 ? (
              <div className="text-sm text-zinc-500">Terminal is ready. Use Run, Save, or Deploy to view logs.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-5">
                  {log}
                </div>
              ))
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
