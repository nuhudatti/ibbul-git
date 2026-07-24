"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminControlCenter } from "@/components/admin/admin-control-center";
import { useAuthStore } from "@/store/auth-store";

export default function AdminPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  if (user?.role !== "ADMIN") return null;

  return <AdminControlCenter />;
}
