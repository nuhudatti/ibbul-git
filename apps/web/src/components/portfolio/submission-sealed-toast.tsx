"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { profilePath } from "@/lib/matric";
import { formatProofHash } from "@/lib/portfolio-hash";

interface SubmissionSealedToastProps {
  show: boolean;
  matric: string;
  hash: string;
  onClose: () => void;
}

export function SubmissionSealedToast({ show, matric, hash, onClose }: SubmissionSealedToastProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 right-6 z-50 max-w-sm ula-glass rounded-2xl border border-emerald-400/25 shadow-2xl shadow-emerald-500/10 p-4"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white p-1"
          >
            <X size={14} />
          </button>
          <div className="flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Sparkles size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1">
                <BadgeCheck size={14} /> Portfolio artifact sealed
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-mono">{formatProofHash(hash)}</p>
              <Link
                href={profilePath(matric)}
                target="_blank"
                className="inline-block mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                View public identity →
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
