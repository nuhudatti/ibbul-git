import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { matricToSlug } from "@/lib/matric";

export function getLiveProjectPath(projectId: string, matricNumber?: string): string {
  const slug = matricNumber ? matricToSlug(matricNumber) : "student";
  return `/live/${slug}/${projectId}`;
}

/** @deprecated Use getLiveProjectPath — deploy now returns real /live/ URLs from the API */
export function generateProjectUrl(projectId: string, matricNumber?: string): string {
  return getLiveProjectPath(projectId, matricNumber);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    html: "html",
    css: "css",
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    py: "python",
  };
  return map[ext ?? ""] ?? "plaintext";
}
