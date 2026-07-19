"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlobalBuildStream } from "@/components/portfolio/global-build-stream";
import { HomeRegistryGateway } from "@/components/home/home-registry-gateway";
import { HomeLandingNav } from "@/components/home/home-landing-nav";
import { useAuthStore } from "@/store/auth-store";
import { MATRIC_FORMAT_HINT, normalizeMatric } from "@/lib/matric";

export function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [matricNumber, setMatricNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricNumber: normalizeMatric(matricNumber),
        password,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Invalid matric number or password");
      setIsLoading(false);
      return;
    }

    login(data.user, data.sessionToken ?? "");
    if (data.user.role === "ADMIN") {
      router.push("/admin");
    } else if (data.user.role === "LECTURER") {
      router.push("/dashboard");
    } else if (data.mustChangePassword) {
      router.push("/workspace/change-password");
    } else {
      router.push("/workspace");
    }
  };

  return (
    <div className="ula-mesh-bg min-h-screen flex flex-col">
      <HomeLandingNav />

      <main className="flex-1 flex flex-col items-center px-6 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-5xl"
        >
          <header className="text-center mb-8 md:mb-10">
            <div className="flex items-center justify-center mb-8">
              <img src="/ibbul-logo.png" alt="IBBUL logo" className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight leading-tight">
              Verified proof-of-work
              <br />
              <span className="text-zinc-400">for every student.</span>
            </h1>
          </header>

          {/* Primary actions */}
          <div className="grid md:grid-cols-2 gap-5 md:gap-6 items-stretch">
            <div className="rounded-2xl border border-cyan-400/20 bg-[#0a0a10]/90 backdrop-blur-xl p-8 shadow-[0_0_0_1px_rgba(0,229,255,0.06)]">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Enter workspace
              </h2>
              <p className="text-sm text-zinc-500 mt-2 mb-8">
                Sign in with your matric to open the IDE, deployments, and your portfolio.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="matric"
                  label="Matric number"
                  placeholder={MATRIC_FORMAT_HINT}
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  autoComplete="username"
                  required
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                {error ? (
                  <p className="text-sm text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                  Enter workspace
                  <ArrowRight size={18} />
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/6 flex items-center gap-2 text-[11px] text-zinc-600">
                <Shield size={12} className="text-zinc-500 shrink-0" />
                Institution-grade · Matric-bound identity
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.45 }}
              className="min-h-[26rem]"
            >
              <HomeRegistryGateway />
            </motion.div>
          </div>

          {/* Accurate live activity feed */}
          <div className="mt-8 md:mt-10">
            <GlobalBuildStream variant="home" />
          </div>
        </motion.div>
      </main>

      <footer className="py-6 text-center text-[11px] text-zinc-600 border-t border-white/5">
        Verified Proof-of-Work Portfolio Engine
      </footer>
    </div>
  );
}
