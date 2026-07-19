import type { ActivityEvent } from "@/types";
import { normalizeMatric } from "@/lib/matric";

export interface GroupedLiveEvent {
  id: string;
  line: string;
  matric: string;
  student: string;
  type: ActivityEvent["type"];
  count: number;
  isLive: boolean;
  timestamp: string;
  severity?: "neutral" | "alert" | "success";
}

function eventKey(e: ActivityEvent): string {
  const matric = normalizeMatric(e.matric);
  if (matric === "SYS") return `system-${e.type}-${e.message.slice(0, 40)}`;
  const topic = e.message.replace(/started |submitted |deployed |asked |detected /gi, "").trim();
  return `${matric}-${e.type}-${topic.slice(0, 32)}`;
}

function formatLine(e: ActivityEvent, count: number): { line: string; severity: GroupedLiveEvent["severity"] } {
  const matric = normalizeMatric(e.matric);
  const name = e.student;
  const suffix = count > 1 ? ` · ${count} updates` : "";

  if (matric === "SYS") {
    return { line: e.message + suffix, severity: e.type === "error" ? "alert" : "neutral" };
  }

  switch (e.type) {
    case "deploy":
      return {
        line: `${matric} deployed ${extractTopic(e.message)}${suffix}`,
        severity: "success",
      };
    case "submit":
      return {
        line: `${name} submitted ${extractTopic(e.message)}${suffix}`,
        severity: "success",
      };
    case "start":
      return {
        line: `${matric} is working on ${extractTopic(e.message)} (active)${suffix}`,
        severity: "neutral",
      };
    case "ai_help":
      return {
        line: `${name} requested AI help on ${extractTopic(e.message)}${suffix}`,
        severity: "neutral",
      };
    case "grade":
      return { line: `${name} ${e.message}${suffix}`, severity: "success" };
    case "error":
      return { line: e.message + suffix, severity: "alert" };
    default:
      return { line: `${name} ${e.message}${suffix}`, severity: "neutral" };
  }
}

function extractTopic(message: string): string {
  const m = message.match(/(?:started|submitted|on|for)\s+(.+)/i);
  return m?.[1]?.trim() ?? message;
}

/** Collapse duplicate spam into single calm intelligence lines */
export function groupActivityEvents(events: ActivityEvent[]): GroupedLiveEvent[] {
  const map = new Map<string, GroupedLiveEvent>();

  for (const e of events) {
    const key = eventKey(e);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.timestamp = e.timestamp;
      existing.isLive = Date.now() - new Date(e.timestamp).getTime() < 120_000;
      const { line, severity } = formatLine(e, existing.count);
      existing.line = line;
      existing.severity = severity;
      continue;
    }

    const { line, severity } = formatLine(e, 1);
    map.set(key, {
      id: key,
      line,
      matric: normalizeMatric(e.matric),
      student: e.student,
      type: e.type,
      count: 1,
      isLive: Date.now() - new Date(e.timestamp).getTime() < 120_000,
      timestamp: e.timestamp,
      severity,
    });
  }

  return [...map.values()]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 14);
}

export function formatRelativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  return `${Math.floor(diff / 3_600_000)}h`;
}
