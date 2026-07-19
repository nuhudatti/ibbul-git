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
          animate={{ height: 180 }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-white/6 bg-[#08080c] overflow-hidden shrink-0"
        >
          <div className="h-8 flex items-center justify-between px-3 border-b border-white/6">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <TerminalIcon size={14} />
              Terminal
            </div>
            <button
              onClick={toggleTerminal}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="h-[calc(180px-32px)] overflow-y-auto ula-scrollbar p-3 font-mono text-xs text-zinc-400 space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="leading-5">
                {log}
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
