import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function GlassPanel({ children, className, active }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "ula-glass rounded-xl",
        active && "ula-glass-active",
        className
      )}
    >
      {children}
    </div>
  );
}
