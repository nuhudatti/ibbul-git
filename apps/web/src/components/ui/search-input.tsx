"use client";

import { Search, X } from "lucide-react";
import { useId } from "react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2 w-full max-w-xl">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 pl-9 pr-9 rounded-lg bg-white/5 border border-white/8 text-sm text-zinc-200 outline-none"
        />
        {value ? (
          <button
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
