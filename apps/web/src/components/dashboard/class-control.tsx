"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerificationQueue } from "@/components/portfolio/verification-queue";
import type { Assignment } from "@/types";

interface ClassControlProps {
  assignments: Assignment[];
  activeClass: string;
  filterRisk: "all" | "watch" | "critical";
  onFilterChange: (f: "all" | "watch" | "critical") => void;
  onPublish: (id: string) => void;
}

const FILTERS = [
  { id: "all" as const, label: "All" },
  { id: "watch" as const, label: "Active" },
  { id: "critical" as const, label: "At risk" },
];

export function ClassControl({
  assignments,
  activeClass,
  filterRisk,
  onFilterChange,
  onPublish,
}: ClassControlProps) {
  const published = assignments.filter((a) => a.status === "PUBLISHED");

  return (
    <div className="flex flex-col h-full gap-5">
      <VerificationQueue />

      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Class</p>
        <div className="relative">
          <select
            className="w-full appearance-none h-10 pl-3 pr-8 rounded-xl bg-white/[0.03] border border-white/8 text-sm text-zinc-200 outline-none focus:border-cyan-400/25 transition-colors"
            defaultValue={activeClass}
          >
            <option>{activeClass}</option>
            <option>CS102 · Data Structures</option>
            <option>CS201 · Algorithms</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">View</p>
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03]">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onFilterChange(id)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[11px] font-medium transition-all",
                filterRisk === id
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2">
          <BookOpen size={12} className="text-cyan-400/80" />
          Assignments
        </p>
        <div className="flex-1 space-y-2 overflow-y-auto ula-scrollbar pr-0.5">
          {published.map((a) => {
            const pct = a.enrolled > 0 ? Math.round((a.submitted / a.enrolled) * 100) : 0;
            return (
              <div
                key={a.id}
                className="p-3 rounded-xl border border-white/6 bg-white/[0.02] hover:border-white/12 transition-colors"
              >
                <div className="flex justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-zinc-200 leading-snug">{a.title}</p>
                  <span className="text-xs font-semibold text-zinc-400 tabular-nums shrink-0">
                    {pct}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400/70 to-violet-500/70 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-600 mt-2">
                  {a.submitted}/{a.enrolled} submitted · Due {a.deadline}
                </p>
              </div>
            );
          })}
          {assignments
            .filter((a) => a.status === "DRAFT")
            .map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPublish(a.id)}
                className="w-full p-3 rounded-xl border border-dashed border-violet-400/25 text-left hover:bg-violet-500/5 transition-colors"
              >
                <p className="text-sm text-violet-300">{a.title}</p>
                <p className="text-[10px] text-zinc-600 mt-1">Draft · tap to publish</p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
