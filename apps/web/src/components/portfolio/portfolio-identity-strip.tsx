"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, ChevronRight, Fingerprint } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { UserAvatar } from "@/components/ui/user-avatar";
import { usePortfolioStore } from "@/store/portfolio-store";
import { normalizeMatric, profilePath } from "@/lib/matric";

export function PortfolioIdentityStrip() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const artifactsMap = usePortfolioStore((s) => s.artifacts);

  const matric = user ? normalizeMatric(user.matricNumber) : "";

  const artifacts = useMemo(() => {
    if (!matric) return [];
    return Object.values(artifactsMap)
      .filter((a) => normalizeMatric(a.studentMatric) === matric)
      .sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [artifactsMap, matric]);

  useEffect(() => {
    if (!matric) return;

    const loadSettings = async () => {
      try {
        console.info("[Workspace] fetching student settings", { matric });
        const res = await fetch(`/api/student/settings?matric=${encodeURIComponent(matric)}`);
        console.info("[Workspace] student settings response", {
          matric,
          status: res.status,
          ok: res.ok,
        });
        const d = await res.json();
        const url = d.settings?.avatarUrl as string | undefined;
        if (!url) return;
        const base = url.split("?")[0];
        const current = useAuthStore.getState().user?.avatarUrl?.split("?")[0];
        if (current !== base) {
          updateUser({ avatarUrl: `${base}?v=${Date.now()}` });
        }
      } catch (error) {
        console.error("[Workspace] failed to fetch student settings", { matric, error });
      }
    };

    loadSettings();
  }, [matric, updateUser]);

  if (!user || user.role !== "STUDENT") return null;

  const avatarSrc = user.avatarUrl
    ? user.avatarUrl.startsWith("http")
      ? user.avatarUrl
      : user.avatarUrl
    : undefined;

  const verified = artifacts.filter((a) => a.verified).length;
  const latest = artifacts[0];

  if (latest && typeof latest.hash !== "string") {
    console.warn("[Workspace] invalid portfolio artifact hash", latest);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="shrink-0 border-b border-white/6 bg-[#08080e]/90"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            name={`${user.firstName} ${user.lastName}`}
            initials={`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`}
            avatarUrl={avatarSrc}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
              VPE · Verified identity
            </p>
            <p className="text-xs text-zinc-300 truncate">
              {verified > 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-400/90">
                  <BadgeCheck size={11} /> {verified} verified
                </span>
              ) : (
                <span>
                  {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}
                </span>
              )}
              {latest ? (
                <span className="text-zinc-600"> · latest: {latest.title}</span>
              ) : null}
            </p>
          </div>
          {latest && typeof latest.hash === "string" ? (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-violet-400/80 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-400/15">
              <Fingerprint size={10} />
              ULA-{latest.hash.slice(0, 4).toUpperCase()}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/verified"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-violet-200 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-400/20 transition-all hover:bg-violet-500/15"
          >
            Global registry
          </Link>
          <Link
            href={profilePath(matric)}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 transition-all hover:bg-cyan-400/15"
          >
            My portfolio
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
