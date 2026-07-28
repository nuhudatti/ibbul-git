"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { resolveAvatarUrl } from "@/lib/utils";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Globe,
  GraduationCap,
  Share2,
  Sparkles,
} from "lucide-react";
import type { PortfolioArtifact, StudentPortfolioProfile } from "@/types";
import { LivingTimeline } from "./living-timeline";
import { SkillConstellation } from "./skill-constellation";
import { PortfolioPrintDocument } from "./portfolio-print-document";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { matricToSlug, normalizeMatric, profilePath } from "@/lib/matric";
import { buildVerifyUrl, generateCredentialSeal } from "@/lib/credential";

interface PublicProfileProps {
  matric: string;
}

export function PublicProfile({ matric }: PublicProfileProps) {
  const [profile, setProfile] = useState<StudentPortfolioProfile | null>(null);
  const [artifacts, setArtifacts] = useState<PortfolioArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyUrl, setVerifyUrl] = useState("");
  const norm = normalizeMatric(matric);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://ula.edu";

  useEffect(() => {
    fetch(`/api/portfolio/${matricToSlug(norm)}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setArtifacts(d.artifacts ?? []);
      })
      .finally(() => setLoading(false));
  }, [norm]);

  useEffect(() => {
    if (!artifacts.length) return;
    generateCredentialSeal(norm, artifacts).then((seal) => {
      setVerifyUrl(buildVerifyUrl(origin, norm, seal));
    });
  }, [norm, artifacts, origin]);

  const publicUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://ula.edu${profilePath(norm)}`;

  const runPrint = async () => {
    const resolvedAvatarUrl = resolveAvatarUrl(profile?.avatarUrl);
    if (resolvedAvatarUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = `${resolvedAvatarUrl}${profile?.updatedAt ? `?v=${profile.updatedAt}` : ""}`;
      });
    }
    document.title = `${profile?.displayName ?? norm} — ULA Verified Portfolio`;
    document.body.classList.add("ula-is-printing");
    const cleanup = () => {
      document.body.classList.remove("ula-is-printing");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    requestAnimationFrame(() => window.print());
  };

  if (loading) {
    return (
      <div className="min-h-screen ula-mesh-bg flex items-center justify-center ula-screen-only">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-sm text-zinc-500"
        >
          Loading verified identity…
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen ula-mesh-bg flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-zinc-400">Builder profile not found.</p>
        <Link href="/" className="text-cyan-400 text-sm hover:underline">
          Return to ULA
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Print-only: structured credential document */}
      <PortfolioPrintDocument
        profile={profile}
        artifacts={artifacts}
        publicUrl={publicUrl}
        origin={origin}
      />

      {/* Screen experience */}
      <div className="ula-screen-only min-h-screen ula-mesh-bg ula-grid-pattern">
        <header className="sticky top-0 z-30 border-b border-white/6 bg-[#050508]/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2 py-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Project ULA
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/verified"
                className="hidden sm:inline-flex text-xs text-zinc-500 hover:text-violet-300 px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-violet-400/25 transition-colors"
              >
                Global registry
              </Link>
              <CopyLinkButton value={publicUrl} size="sm" label="Share profile" />
              <button
                type="button"
                onClick={runPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600/90 to-violet-600/90 border border-white/10 hover:opacity-90 transition-opacity shadow-lg shadow-cyan-500/10"
              >
                <FileText size={13} />
                Print credential (PDF)
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10 md:py-14">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl border border-white/10 overflow-hidden mb-10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-600/10" />
            <div className="absolute inset-0 ula-shimmer opacity-20 pointer-events-none" />
            <div className="relative p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end gap-6">
                <UserAvatar
                  name={profile.displayName}
                  initials={profile.avatar}
                  avatarUrl={
                    profile.avatarUrl
                      ? `${profile.avatarUrl.split("?")[0]}?v=${profile.updatedAt ?? "1"}`
                      : undefined
                  }
                  size="xl"
                  className="!h-20 !w-20 !text-2xl shadow-xl"
                />
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80 font-medium mb-2">
                    Verified proof-of-work identity
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {profile.displayName}
                  </h1>
                  <p className="text-zinc-400 mt-2 font-mono text-sm">{profile.matric}</p>
                  <p className="text-zinc-500 text-sm mt-3 max-w-xl">{profile.headline}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {[
                  { label: "Verified artifacts", value: profile.verifiedCount, icon: BadgeCheck },
                  { label: "Total projects", value: profile.totalArtifacts, icon: Sparkles },
                  { label: "Live deploys", value: profile.liveDeploys, icon: Globe },
                  {
                    label: "Avg score",
                    value: profile.avgScore != null ? `${profile.avgScore}%` : "—",
                    icon: GraduationCap,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-black/30 border border-white/6 px-4 py-3"
                  >
                    <Icon size={14} className="text-cyan-400 mb-2" />
                    <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-zinc-600 mt-6 flex items-center gap-2">
                <Share2 size={12} />
                {profile.institution} · {profile.program}
              </p>

              {verifyUrl ? (
                <p className="text-[11px] text-zinc-500 mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/6">
                  <strong className="text-zinc-400">Verify anywhere:</strong>{" "}
                  <a href={verifyUrl} className="text-cyan-400/90 hover:underline break-all">
                    {verifyUrl}
                  </a>
                  {" "}— QR on the printed credential links here. Only platform-issued documents pass.
                </p>
              ) : null}
              <p className="text-[11px] text-zinc-600 mt-2">
                Print includes watermark, platform seal, faculty signatures, and scannable QR verification.
              </p>
            </div>
          </motion.section>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                <span className="w-8 h-px bg-gradient-to-r from-cyan-400/50 to-transparent" />
                Living portfolio timeline
              </h2>
              <LivingTimeline artifacts={artifacts} publicView baseUrl="" />
            </div>
            <aside className="space-y-6">
              <SkillConstellation artifacts={artifacts} />
              <div className="ula-glass rounded-2xl p-5 border border-emerald-400/15">
                <p className="text-xs text-emerald-300/90 font-medium mb-2">Institution seal</p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Each entry is hashed, timestamped, and verifiable by assigned lecturers within
                  Project ULA.
                </p>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
