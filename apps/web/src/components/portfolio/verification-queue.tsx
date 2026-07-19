"use client";

import { useMemo } from "react";
import { usePortfolioStore } from "@/store/portfolio-store";
import { useAuthStore } from "@/store/auth-store";
import { BadgeCheck, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatProofHash } from "@/lib/portfolio-hash";

export function VerificationQueue() {
  const user = useAuthStore((s) => s.user);
  const artifacts = usePortfolioStore((s) => s.artifacts);
  const verifyArtifact = usePortfolioStore((s) => s.verifyArtifact);

  const pending = useMemo(
    () =>
      Object.values(artifacts).filter(
        (a) => a.status === "SUBMITTED" && !a.verified
      ),
    [artifacts]
  );

  if (!user || user.role !== "LECTURER" || pending.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-200">
          Portfolio verification · {pending.length} pending
        </h3>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto ula-scrollbar">
        {pending.slice(0, 5).map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/6"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{a.title}</p>
              <p className="text-[10px] text-zinc-500">
                {a.studentName} · {formatProofHash(a.hash)}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                variant="success"
                onClick={() =>
                  verifyArtifact(a.id, user.matricNumber, `${user.firstName} ${user.lastName}`, true)
                }
              >
                <BadgeCheck size={12} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  verifyArtifact(
                    a.id,
                    user.matricNumber,
                    `${user.firstName} ${user.lastName}`,
                    false,
                    "Needs revision"
                  )
                }
              >
                <X size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
