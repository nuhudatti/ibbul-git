"use client";

import { useAuthStore } from "@/store/auth-store";

export function adminHeaders(): HeadersInit {
  const token = useAuthStore.getState().sessionToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function adminFetch(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...adminHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
