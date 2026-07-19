"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyLinkButtonProps {
  value: string;
  className?: string;
  size?: "sm" | "md";
  label?: string;
}

export function CopyLinkButton({ value, className, size = "md", label = "Copy link" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      /* clipboard blocked */
    }
  }, [value]);

  const iconSize = size === "sm" ? 14 : 16;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-xl font-medium transition-all",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        copied
          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-lg shadow-emerald-500/10"
          : "bg-white/8 text-zinc-200 border border-white/10 hover:bg-white/12 hover:border-cyan-400/30",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Check size={iconSize} className="text-emerald-400" />
            Copied to clipboard!
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Copy size={iconSize} />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
