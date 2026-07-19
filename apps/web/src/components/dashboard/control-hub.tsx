"use client";

import { Filter, Plus, BookOpen, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssignmentStreamCard } from "./assignment-stream-card";
import type { Assignment } from "@/types";

interface ControlHubProps {
  assignments: Assignment[];
  activeClass: string;
  filterRisk: "all" | "watch" | "critical";
  onFilterChange: (f: "all" | "watch" | "critical") => void;
  onPublish: (id: string) => void;
}

export function ControlHub({
  assignments,
  activeClass,
  filterRisk,
  onFilterChange,
  onPublish,
}: ControlHubProps) {
  const filters = [
    { id: "all" as const, label: "All", icon: Users },
    { id: "watch" as const, label: "Watch", icon: Filter },
    { id: "critical" as const, label: "At Risk", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Active Class</p>
        <select className="w-full h-10 px-3 rounded-xl ula-glass text-sm text-zinc-200 border border-white/8 bg-transparent outline-none focus:border-cyan-400/30">
          <option>{activeClass}</option>
          <option>CS102-DataStructures</option>
          <option>CS201-Algorithms</option>
        </select>
      </div>

      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/3">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] transition-all",
              filterRisk === id
                ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/20"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen size={16} className="text-cyan-400" />
          Work Streams
        </h2>
        <Button size="sm" variant="ghost">
          <Plus size={14} />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto ula-scrollbar pr-1">
        {assignments.map((a, i) => (
          <AssignmentStreamCard key={a.id} assignment={a} index={i} onPublish={onPublish} />
        ))}
      </div>
    </div>
  );
}
