"use client";

import { useMemo, useState } from "react";
import { BookOpen, Plus, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssignmentStore } from "@/store/assignment-store";
import { assignmentStats } from "@/lib/lecturer-data";
import { getClassRosterMatrics } from "@/lib/class-roster";
import { cn } from "@/lib/utils";
import { CreateAssignmentModal } from "./create-assignment-modal";
import { useAuthStore } from "@/store/auth-store";

export function AssignmentStudio() {
  const assignments = useAssignmentStore((s) => s.assignments);
  const enrollments = useAssignmentStore((s) => s.enrollments);
  const activeClassId = useAssignmentStore((s) => s.activeClassId);
  const publishAssignment = useAssignmentStore((s) => s.publishAssignment);
  const closeAssignment = useAssignmentStore((s) => (s as any).closeAssignment as (id: string) => void);
  const deleteAssignment = useAssignmentStore((s) => (s as any).deleteAssignment as (id: string) => void);
  const user = useAuthStore((s) => s.user);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...assignments].sort((a, b) => {
        if (a.status === "PUBLISHED" && b.status !== "PUBLISHED") return -1;
        if (b.status === "PUBLISHED" && a.status !== "PUBLISHED") return 1;
        return 0;
      }),
    [assignments]
  );

  const selected = assignments.find((a) => a.id === selectedId);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Your class</p>
          <p className="text-sm font-medium text-zinc-200">{activeClassId}</p>
          <p className="text-[11px] text-zinc-600 mt-1">{getClassRosterMatrics().length} students on roster</p>
        </div>

        <Button className="w-full mb-4" size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New assignment
        </Button>

        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-2">
          <BookOpen size={12} className="text-cyan-400/80" />
          Assignments you created
        </p>

        <div className="flex-1 space-y-2 overflow-y-auto ula-scrollbar pr-0.5 min-h-0">
          {sorted.map((a) => {
            const stats = assignmentStats(a.id, enrollments, getClassRosterMatrics().length);
            const isSelected = selectedId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all",
                  isSelected
                    ? "border-cyan-400/30 bg-cyan-400/5"
                    : "border-white/6 bg-white/[0.02] hover:border-white/12"
                )}
              >
                <div className="flex justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-zinc-200 leading-snug">{a.title}</p>
                  <span
                    className={cn(
                      "text-[9px] uppercase px-1.5 py-0.5 rounded shrink-0",
                      a.status === "PUBLISHED"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-violet-500/15 text-violet-300"
                    )}
                  >
                    {a.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-600">
                  {stats.submitted} submitted · {stats.inProgress} in progress · Due {a.deadline}
                </p>
              </button>
            );
          })}
        </div>

        {selected ? (
          <div className="mt-4 p-3 rounded-xl border border-white/8 bg-white/[0.02] shrink-0">
            <p className="text-xs font-medium text-zinc-300 mb-2">{selected.title}</p>
            <p className="text-[11px] text-zinc-500 line-clamp-3 mb-3">{selected.instructions}</p>
            {user ? (
              <p className="text-[11px] text-zinc-500 mb-3">Instructor: <strong className="text-white">{user.firstName} {user.lastName}</strong></p>
            ) : null}
            {selected.status === "DRAFT" ? (
              <Button size="sm" className="w-full" onClick={() => publishAssignment(selected.id)}>
                <Send size={14} />
                Publish to students
              </Button>
            ) : selected.status === "PUBLISHED" ? (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => closeAssignment(selected.id)}>
                  <XCircle size={14} />
                  Close assignment
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    if (confirm('Delete this assignment and its enrollments? This cannot be undone.')) {
                      deleteAssignment(selected.id);
                      setSelectedId(null);
                    }
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            ) : selected.status === "CLOSED" ? (
              <div className="flex gap-2 flex-col sm:flex-row">
                <Button size="sm" className="flex-1" onClick={() => useAssignmentStore.getState().reopenAssignment(selected.id)}>
                  <Send size={14} />
                  Reopen assignment
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    if (confirm('Delete this closed assignment and its enrollments? This cannot be undone.')) {
                      deleteAssignment(selected.id);
                      setSelectedId(null);
                    }
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <CreateAssignmentModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
