"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentSettingsPage } from "@/components/settings/student-settings-page";
import { useAuthStore } from "@/store/auth-store";

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "STUDENT") {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "STUDENT") return null;

  return <StudentSettingsPage />;
}
