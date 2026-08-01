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

export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "just now";
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "just now";
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
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

export function resolveCreationPath(path: string, parentFolder?: string | null): string {
  const normalizedPath = path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!normalizedPath) return "";

  const normalizedParent = (parentFolder ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/");

  if (!normalizedParent) return normalizedPath;
  if (normalizedPath.includes("/")) return normalizedPath;
  return `${normalizedParent}/${normalizedPath}`;
}

export function resolveDeployUrl(deployUrl?: string | null, baseUrl?: string): string | null {
  if (!deployUrl) return null;
  const raw = deployUrl.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const host = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  if (!host) return raw; // fallback
  // Ensure single slash join
  return `${host.replace(/\/+$/g, "")}/${raw.replace(/^\/+/, "")}`;
}

export function resolveAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  const trimmed = avatarUrl.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return trimmed.split("?")[0];
  }
  return trimmed.split("?")[0];
}
