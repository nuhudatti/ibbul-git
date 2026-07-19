"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  initials: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg" | "xl" | "cert";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-11 w-11 text-xs",
  lg: "h-16 w-16 text-sm",
  xl: "h-24 w-24 text-lg",
  cert: "h-[28mm] w-[28mm] text-sm",
};

export function UserAvatar({
  name,
  initials,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const src = avatarUrl?.split("?")[0];

  if (src) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "rounded-full object-cover border-2 border-cyan-400/30 shadow-lg shadow-cyan-500/10",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white",
        "bg-gradient-to-br from-cyan-500/40 to-violet-600/40 border border-white/15",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
