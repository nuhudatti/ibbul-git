"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { profilePath } from "@/lib/matric";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Fingerprint,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { resolveAvatarUrl } from "@/lib/utils";
import type { PortfolioArtifact, StudentPortfolioProfile } from "@/types";
import type { CredentialSignatory } from "@/lib/credential";
import { formatProofHash } from "@/lib/portfolio-hash";

interface VerifyPayload {
  valid: boolean;
  matric: string;
  credentialId: string;
  platformSignature: string;
  issuedAt: string;
  profile: StudentPortfolioProfile | null;
  artifacts: PortfolioArtifact[];
  verifiedCount: number;
  message: string;
  signatories: CredentialSignatory[];
}

interface CredentialVerifyViewProps {
  token: string;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function CredentialVerifyView({ token }: CredentialVerifyViewProps) {
  const [data, setData] = useState<VerifyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/credential/verify/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen ula-mesh-bg flex items-center justify-center">
        <p className="text-sm text-zinc-500">Verifying credential with ULA registry…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen ula-mesh-bg flex flex-col items-center justify-center gap-4 p-8">
        <ShieldAlert className="text-amber-400" size={40} />
        <p className="text-zinc-300">Unable to reach verification service.</p>
        <Link href="/" className="text-cyan-400 text-sm hover:underline">
          Return to ULA
        </Link>
      </div>
    );
  }

  const valid = data.valid;

  const resolvedAvatarUrl = resolveAvatarUrl(data.profile?.avatarUrl);

  return (
    <div className="min-h-screen ula-mesh-bg ula-grid-pattern">
      <header className="border-b border-white/6 bg-[#050508]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
          >
            <ArrowLeft size={16} />
            Project ULA
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
            Credential verification
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border p-8 md:p-10 ${
            valid
              ? "border-emerald-400/25 bg-emerald-500/5"
              : "border-amber-400/25 bg-amber-500/5"
          }`}
        >
          <div className="flex items-start gap-4">
            {valid && resolvedAvatarUrl ? (
              <img
                src={resolvedAvatarUrl}
                alt={data.profile?.displayName ?? "Verified student"}
                className="h-14 w-14 rounded-full object-cover border border-emerald-400/20"
              />
            ) : valid ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-400/20">
                {data.profile?.avatar}
              </div>
            ) : (
              <ShieldAlert className="text-amber-400 shrink-0" size={44} />
            )}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
                {valid ? "Authentic credential" : "Verification failed"}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {valid ? data.profile?.displayName : "Credential not verified"}
              </h1>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{data.message}</p>
            </div>
          </div>

          <dl className="mt-8 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 py-2 border-b border-white/6">
              <dt className="text-zinc-500">Credential ID</dt>
              <dd className="font-mono text-cyan-300/90">{data.credentialId}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-white/6">
              <dt className="text-zinc-500">Matric</dt>
              <dd className="font-mono text-white">{data.matric}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-white/6">
              <dt className="text-zinc-500">Issued</dt>
              <dd className="text-white">{formatWhen(data.issuedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-white/6">
              <dt className="text-zinc-500">Verified projects</dt>
              <dd className="text-white tabular-nums">
                {data.verifiedCount} / {data.artifacts.length}
              </dd>
            </div>
            <div className="py-2">
              <dt className="text-zinc-500 mb-1 flex items-center gap-1.5">
                <Fingerprint size={14} />
                Platform signature
              </dt>
              <dd className="font-mono text-xs text-emerald-300/80 break-all">
                {data.platformSignature}
              </dd>
            </div>
          </dl>

          {valid && data.profile ? (
            <Link
              href={profilePath(data.matric)}
              className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-cyan-600/80 hover:bg-cyan-600 border border-white/10"
            >
              <ExternalLink size={14} />
              View live portfolio
            </Link>
          ) : null}
        </motion.div>

        {valid && data.signatories.length > 0 ? (
          <section className="mt-8 ula-glass rounded-2xl p-6 border border-white/8">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Shield size={16} className="text-cyan-400" />
              Authorized signatures
            </h2>
            <ul className="space-y-4">
              {data.signatories.map((s, i) => (
                <li
                  key={`${s.role}-${i}`}
                  className="rounded-xl bg-black/25 border border-white/6 px-4 py-3"
                >
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.title}</p>
                  {s.signatureCode ? (
                    <p className="font-mono text-[10px] text-cyan-400/70 mt-2 break-all">
                      {s.signatureCode}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-zinc-600 mt-1">{formatWhen(s.signedAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {valid && data.artifacts.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BadgeCheck size={14} className="text-emerald-400" />
              Bound artifacts
            </h2>
            <ul className="space-y-3">
              {data.artifacts.map((a) => (
                <li
                  key={a.id}
                  className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3"
                >
                  <p className="text-white font-medium">{a.title}</p>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">
                    {formatProofHash(a.hash)}
                    {a.verified ? " · verified" : " · pending"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!valid ? (
          <div className="mt-8 flex items-start gap-3 p-4 rounded-xl border border-amber-400/20 bg-amber-500/5">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-zinc-400 leading-relaxed">
              Only credentials issued and sealed by Project ULA can pass verification. Copies,
              screenshots, or edited PDFs will not match the platform registry.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
