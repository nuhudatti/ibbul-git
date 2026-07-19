"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MissionControl } from "@/components/dashboard/mission-control";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "LECTURER") {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "LECTURER") return null;

  return <MissionControl />;
}
