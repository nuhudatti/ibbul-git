"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  Send,
  Bot,
  AlertCircle,
  Trophy,
  Play,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/types";

const TYPE_CONFIG: Record<
  ActivityEvent["type"],
  { icon: typeof Play; color: string; bg: string }
> = {
  start: { icon: Play, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  deploy: { icon: Rocket, color: "text-violet-400", bg: "bg-violet-400/10" },
  submit: { icon: Send, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ai_help: { icon: Bot, color: "text-blue-400", bg: "bg-blue-400/10" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
  grade: { icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/10" },
  idle: { icon: Radio, color: "text-zinc-400", bg: "bg-zinc-400/10" },
};

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

interface ActivityStreamProps {
  events: ActivityEvent[];
}

export function ActivityStream({ events }: ActivityStreamProps) {
  return (
    <div className="space-y-1 ula-scrollbar overflow-y-auto flex-1 pr-1">
      {events.map((event, i) => {
        const cfg = TYPE_CONFIG[event.type];
        const Icon = cfg.icon;
        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border border-transparent",
              "hover:border-white/8 hover:bg-white/2 transition-colors group"
            )}
          >
            <div className={cn("p-2 rounded-lg shrink-0", cfg.bg)}>
              <Icon size={14} className={cfg.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 leading-snug">
                <span className="font-medium text-white">{event.student}</span>{" "}
                {event.message}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                {event.matric} · {formatTime(event.timestamp)}
              </p>
            </div>
            {i === 0 ? (
              <span className="ula-pulse w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
