"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssignmentStore } from "@/store/assignment-store";
import { BLANK_STARTER } from "@/lib/mock-data";
import type { Assignment } from "@/types";

interface CreateAssignmentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAssignmentModal({ open, onClose }: CreateAssignmentModalProps) {
  const createAssignment = useAssignmentStore((s) => s.createAssignment);
  const publishAssignment = useAssignmentStore((s) => s.publishAssignment);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  });
  const [maxScore, setMaxScore] = useState("100");
  const [difficulty, setDifficulty] = useState<Assignment["difficulty"]>("intermediate");
  const [publishNow, setPublishNow] = useState(true);

  const reset = () => {
    setTitle("");
    setDescription("");
    setInstructions("");
    setDeadline("");
    setMaxScore("100");
    setDifficulty("intermediate");
    setPublishNow(true);
  };

  const handleCreate = async () => {
    if (!title.trim() || !deadline) return;
    const id = await createAssignment({
      title: title.trim(),
      description: description.trim() || "Complete this assignment in the ULA workspace.",
      instructions: instructions.trim() || "Build and submit via the student IDE.",
      deadline,
      maxScore: Number(maxScore) || 100,
      difficulty,
      starterFiles: BLANK_STARTER,
    });
    if (!id) {
      alert("Failed to create assignment. Please try again.");
      return;
    }
    if (publishNow) await publishAssignment(id);
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="ula-glass w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Create assignment</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Students see it in My Projects after you publish
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto ula-scrollbar pr-1">
              <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Personal Portfolio" required />
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-20 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-zinc-200 outline-none focus:border-cyan-400/30 resize-none"
                  placeholder="What students will build"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full h-16 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-zinc-200 outline-none focus:border-cyan-400/30 resize-none"
                  placeholder="Rubric expectations"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
                <Input label="Max score" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {(["beginner", "intermediate", "advanced"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg text-xs capitalize border transition-colors ${
                        difficulty === d
                          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                          : "border-white/8 text-zinc-500"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={(e) => setPublishNow(e.target.checked)}
                  className="rounded border-white/20"
                />
                Publish immediately to class roster
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={!title.trim() || !deadline}>
                <Plus size={16} />
                {publishNow ? "Create & publish" : "Save draft"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
