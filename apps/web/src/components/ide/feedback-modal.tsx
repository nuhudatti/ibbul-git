"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Comment {
  id: string;
  message: string;
  filePath?: string | null;
  lineNumber?: number | null;
  feedbackType?: string;
  priority?: string;
  createdAt?: string;
  authorRole?: string;
}

export function FeedbackModal({ open, onClose, comments }: { open: boolean; onClose: () => void; comments: Comment[] }) {
  const lecturerComments = comments.filter((c) => (c.authorRole ?? "LECTURER") !== "STUDENT");
  const ordered = [...lecturerComments].reverse(); // newest first

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c0c12] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Changes Requested</h3>
            <p className="text-sm text-zinc-400 mt-1">Lecturer feedback (quick reference)</p>

            <div className="mt-4 space-y-3 max-h-72 overflow-auto">
              {ordered.length === 0 ? (
                <div className="rounded-lg border border-white/6 bg-black/40 p-4 text-sm text-zinc-400">
                  No lecturer feedback messages are available.
                </div>
              ) : (
                ordered.map((c) => (
                  <div key={c.id} className="rounded-lg border border-white/6 bg-black/40 p-4">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <div>{c.feedbackType ?? "Feedback"}</div>
                      <div>{c.priority}</div>
                    </div>
                    <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap">{c.message}</div>
                    {c.filePath ? (
                      <div className="mt-2 text-[11px] text-zinc-500">File: {c.filePath}{c.lineNumber ? ` · line ${c.lineNumber}` : ""}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" size="md" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
