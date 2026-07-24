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
    if (!isAuthenticated || !["ADMIN", "SUPER_ADMIN"].includes(user?.role ?? "")) {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return null;

  return <AdminControlCenter />;
}
