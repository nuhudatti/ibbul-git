"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        className={cn(
          "w-full h-12 px-4 rounded-xl ula-glass text-zinc-100 placeholder:text-zinc-500",
          "border border-white/8 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10",
          "transition-all duration-200 ula-focus outline-none",
          error && "border-red-500/50",
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  )
);

Input.displayName = "Input";
