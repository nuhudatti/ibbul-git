"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { useAuthStore } from "@/store/auth-store";

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearMustChangePassword = useAuthStore((s) => s.clearMustChangePassword);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "STUDENT") {
      router.replace("/");
      return;
    }
    if (!user.mustChangePassword) {
      router.replace("/workspace");
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/first-login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matric: user?.matricNumber,
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not update password");
      return;
    }

    clearMustChangePassword();
    router.replace("/workspace");
  };

  if (!user?.mustChangePassword) return null;

  return (
    <div className="ula-mesh-bg min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-[#0a0a10]/90 backdrop-blur-xl p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-400/25 mb-6">
            <KeyRound size={22} className="text-amber-400" />
          </div>

          <h1 className="text-xl font-semibold text-white tracking-tight">
            Set your new password
          </h1>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
            Your account was provisioned with a temporary password. For security, you must
            choose a new password before accessing your workspace.
          </p>
          <p className="text-xs text-zinc-600 mt-3 font-mono">{user.matricNumber}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              id="current"
              label="Temporary password"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
            <Input
              id="new"
              label="New password"
              type="password"
              placeholder="At least 8 characters"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <Input
              id="confirm"
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Continue to workspace
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-zinc-600">
            <Shield size={12} />
            Name and matric are institution-locked · only your photo can be updated later
          </div>
        </div>
      </motion.div>
    </div>
  );
}
