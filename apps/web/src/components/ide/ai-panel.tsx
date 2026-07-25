"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdeStore } from "@/store/ide-store";
import { cn } from "@/lib/utils";

export function AiPanel() {
  const isOpen = useIdeStore((s) => s.isAiPanelOpen);
  const messages = useIdeStore((s) => s.aiMessages);
  const isThinking = useIdeStore((s) => s.isAiThinking);
  const addAiMessage = useIdeStore((s) => s.addAiMessage);
  const setAiThinking = useIdeStore((s) => s.setAiThinking);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    addAiMessage({ role: "user", content: text.trim() });
    setAiThinking(true);

  try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      addAiMessage({ role: "assistant", content: data.reply });
    } catch {
      addAiMessage({
        role: "assistant",
        content: "I'm here to help! Try asking me to explain your code or debug an error.",
      });
    } finally {
      setAiThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-full sm:w-80 h-full min-h-[280px] max-h-[calc(100vh-160px)] border-t border-white/6 sm:border-t-0 sm:border-l bg-[#0a0a0f] flex flex-col shrink-0">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-white/6">
        <Bot size={16} className="text-cyan-400" />
        <div>
          <p className="text-sm font-semibold text-zinc-200">AI Mentor</p>
          <p className="text-[11px] text-zinc-500">Code help and explanations</p>
        </div>
        <button
          type="button"
          onClick={() => useIdeStore.getState().toggleAiPanel()}
          className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Close AI mentor"
        >
          <X size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto ula-scrollbar p-3 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl px-3 py-2 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-violet-500/15 text-violet-100 ml-4"
                : "bg-white/5 text-zinc-300 mr-2"
            )}
          >
            {msg.content}
          </motion.div>
        ))}
        {isThinking ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm px-3">
            <span className="ula-pulse">●</span>
            <span className="ula-pulse" style={{ animationDelay: "0.2s" }}>●</span>
            <span className="ula-pulse" style={{ animationDelay: "0.4s" }}>●</span>
          </div>
        ) : null}
      </div>

      <form
        className="p-3 border-t border-white/6"
        onSubmit={(e) => {
          e.preventDefault();
          const val = inputRef.current?.value ?? "";
          if (inputRef.current) inputRef.current.value = "";
          sendMessage(val);
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            placeholder="Ask for hints, explanations..."
            className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-white/5 border border-white/8 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-cyan-400/30"
          />
          <Button type="submit" size="sm" variant="secondary" className="shrink-0">
            <Send size={14} />
          </Button>
        </div>
      </form>
    </aside>
  );
}
