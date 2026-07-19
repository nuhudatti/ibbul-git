import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 20, text: "text-lg" },
  md: { icon: 28, text: "text-xl" },
  lg: { icon: 36, text: "text-3xl" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-lg" />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600">
          <Sparkles size={s.icon * 0.55} className="text-white" />
        </div>
      </div>
      {showText ? (
        <div>
          <span className={cn("font-bold tracking-tight text-white", s.text)}>
            Project <span className="text-cyan-400">ULA</span>
          </span>
          {size === "lg" ? (
            <p className="text-xs text-zinc-500 tracking-widest uppercase">
              Unified Learning Architecture
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
