"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Download,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  FileText,
  FileUp,
  Upload,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { adminStudentApiPath } from "@/lib/admin-student-api";
import { adminFetch } from "@/lib/admin-api";
import { downloadCredentialsPdf } from "@/lib/credentials-pdf";
import { useAuthStore } from "@/store/auth-store";
import {
  buildCredentialsCsv,
  buildCredentialsTxt,
} from "@/lib/temp-password";
import type { AdminStats, AdminStudentRecord, StudentAccountStatus } from "@/types";
import { parseBulkCsvText, parseBulkFileContent } from "@/lib/bulk-import-parse";
import { MATRIC_FORMAT_DESC, MATRIC_FORMAT_HINT } from "@/lib/matric";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";

type CredentialRow = {
  matric: string;
  fullName: string;
  program: string;
  tempPassword: string;
  status: string;
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
      <p className={cn("text-2xl font-bold tabular-nums", accent ?? "text-white")}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">{label}</p>
    </div>
  );
}

export function AdminControlCenter() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<AdminStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentAccountStatus>("all");
  const [tab, setTab] = useState<"roster" | "add" | "bulk">("roster");
  const [lastCreds, setLastCreds] = useState<CredentialRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    matric: "",
    firstName: "",
    lastName: "",
    program: "B.Sc Computer Science",
    email: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [actionMatric, setActionMatric] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [confirm, setConfirm] = useState<{
    type: "reset" | "suspend" | "activate";
    matric: string;
    name: string;
  } | null>(null);

  const loginUrl =
    typeof window !== "undefined" ? `${window.location.origin}/` : "https://ula.edu/";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSessionExpired = useCallback(
    (message?: string) => {
      showToast(
        message ??
          "Your admin session expired (common after a dev server restart). Sign in again as ADMIN001."
      );
      logout();
      router.replace("/");
    },
    [logout, router]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes] = await Promise.all([
        adminFetch("/api/admin/stats"),
        adminFetch("/api/admin/students"),
      ]);
      const statsData = await statsRes.json();
      const studentsData = await studentsRes.json();

      if (statsRes.status === 401 || studentsRes.status === 401) {
        handleSessionExpired(statsData.error ?? studentsData.error);
        return;
      }

      if (statsRes.ok) setStats(statsData.stats);
      if (studentsRes.ok) setStudents(studentsData.students ?? []);
    } finally {
      setLoading(false);
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.matric.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        s.program.toLowerCase().includes(q)
      );
    });
  }, [students, query, statusFilter]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch("/api/admin/students", {
      method: "POST",
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired(data.error);
        return;
      }
      showToast(data.error ?? "Failed to add student");
      return;
    }
    const row: CredentialRow = {
      matric: data.student.matric,
      fullName: data.student.displayName,
      program: data.student.program,
      tempPassword: data.tempPassword,
      status: data.student.status,
    };
    setLastCreds([row]);
    setAddForm({
      matric: "",
      firstName: "",
      lastName: "",
      program: "B.Sc Computer Science",
      email: "",
    });
    showToast(`Created ${row.matric} — download credentials below`);
    setTab("roster");
    load();
  };

  const parseBulkRows = () => parseBulkCsvText(bulkText);

  const applyBulkFile = async (file: File) => {
    const name = file.name;
    const lower = name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".txt") && !lower.endsWith(".json")) {
      showToast("Use a .csv, .txt, or .json file from student intake export");
      return;
    }
    try {
      const text = await file.text();
      const rows = parseBulkFileContent(text, name);
      if (rows.length === 0) {
        showToast("No valid student rows in file");
        return;
      }
      setBulkText(
        rows
          .map((r) =>
            [
              r.matric.includes(",") ? `"${r.matric}"` : r.matric,
              r.firstName,
              r.lastName,
              r.program ?? "B.Sc Computer Science",
              r.email ?? "",
            ].join(", ")
          )
          .join("\n")
      );
      setBulkFileName(name);
      showToast(`Loaded ${rows.length} row(s) from ${name}. Review below, then import.`);
      setTab("bulk");
    } catch {
      showToast("Could not read file. Check format (CSV or JSON from intake export).");
    }
  };

  const handleBulkFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void applyBulkFile(file);
    e.target.value = "";
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void applyBulkFile(file);
  };

  const runBulkImport = async (
    rows: ReturnType<typeof parseBulkCsvText>
  ) => {
    if (rows.length === 0) {
      showToast("No valid rows. Format: matric, first name, last name, program");
      return;
    }
    const res = await adminFetch("/api/admin/students/bulk", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        handleSessionExpired(data.error);
        return;
      }
      showToast(data.error ?? "Bulk import failed");
      return;
    }
    const creds: CredentialRow[] = (data.created ?? []).map(
      (c: { record: AdminStudentRecord; tempPassword: string }) => ({
        matric: c.record.matric,
        fullName: c.record.displayName,
        program: c.record.program,
        tempPassword: c.tempPassword,
        status: c.record.status,
      })
    );
    setLastCreds(creds);
    showToast(
      `Imported ${creds.length} student(s)${data.errors?.length ? ` · ${data.errors.length} skipped` : ""}`
    );
    setBulkText("");
    setBulkFileName(null);
    setTab("roster");
    load();
  };

  const handleBulkImport = async () => {
    await runBulkImport(parseBulkRows());
  };

  const resetPassword = async (matric: string) => {
    setActionMatric(matric);
    try {
      const res = await adminFetch(adminStudentApiPath(matric, "reset-password"), {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          handleSessionExpired(data.error);
          return;
        }
        showToast(data.error ?? "Reset failed");
        return;
      }
      const s = students.find((x) => x.matric === matric);
      setLastCreds([
        {
          matric,
          fullName: s?.displayName ?? matric,
          program: s?.program ?? "",
          tempPassword: data.tempPassword,
          status: "pending",
        },
      ]);
      showToast(`New temp password for ${matric} — download PDF to share`);
      await load();
    } finally {
      setActionMatric(null);
      setConfirm(null);
    }
  };

  const setStatus = async (matric: string, status: StudentAccountStatus) => {
    setActionMatric(matric);
    try {
      const res = await adminFetch(adminStudentApiPath(matric), {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          handleSessionExpired(data.error);
          return;
        }
        showToast(data.error ?? "Update failed");
        return;
      }
      showToast(`${matric} → ${status}`);
      await load();
    } finally {
      setActionMatric(null);
      setConfirm(null);
    }
  };

  const runConfirmAction = () => {
    if (!confirm) return;
    if (confirm.type === "reset") void resetPassword(confirm.matric);
    else if (confirm.type === "suspend") void setStatus(confirm.matric, "suspended");
    else void setStatus(confirm.matric, "active");
  };

  const downloadPdf = async (rows: CredentialRow[] = lastCreds) => {
    if (rows.length === 0) return;
    setPdfLoading(true);
    showToast(`Preparing compact PDF (${rows.length} student${rows.length > 1 ? "s" : ""})…`);
    try {
      const result = await downloadCredentialsPdf(rows, loginUrl);
      showToast(
        `PDF ready — ${result.count} student(s) in ${result.pages} page(s). Students search their matric with Ctrl+F.`
      );
    } catch {
      showToast("PDF export failed — try again");
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadCsv = () => {
    if (lastCreds.length === 0) return;
    downloadFile(
      buildCredentialsCsv(lastCreds, loginUrl),
      `ula-credentials-${Date.now()}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  const downloadTxt = () => {
    if (lastCreds.length === 0) return;
    downloadFile(
      buildCredentialsTxt(lastCreds, loginUrl),
      `ula-credentials-${Date.now()}.txt`,
      "text/plain;charset=utf-8"
    );
  };

  return (
    <div className="ula-mesh-bg min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050508]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <div className="hidden sm:block border-l border-white/10 pl-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Super Admin</p>
              <p className="text-xs text-white font-medium">Institution Control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button
              type="button"
              onClick={() => load()}
              className="p-2 rounded-lg border border-white/8 text-zinc-500 hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-emerald-400/90 mb-2">
            <Shield size={16} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold">
              Project ULA · Registry Authority
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            Student provisioning center
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-2xl leading-relaxed">
            Add students individually or in bulk. Each receives a temporary password and must
            change it before workspace access. Identity fields are locked; students may update
            their photo only.
          </p>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <StatCard label="Total students" value={stats.totalStudents} />
            <StatCard label="Active" value={stats.active} accent="text-emerald-400" />
            <StatCard label="Pending" value={stats.pending} accent="text-amber-400" />
            <StatCard label="Suspended" value={stats.suspended} accent="text-red-400/90" />
            <StatCard label="Must change pwd" value={stats.mustChangePassword} />
            <StatCard label="Added today" value={stats.registeredToday} />
          </div>
        ) : null}

        {lastCreds.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 md:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Credentials ready — {lastCreds.length} account
                  {lastCreds.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xl">
                  One compact PDF for all students — dense table, find your row with Ctrl+F
                  (matric). Login: {loginUrl}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  isLoading={pdfLoading}
                  onClick={() => void downloadPdf()}
                >
                  <FileText size={14} />
                  Download PDF
                </Button>
                <Button size="sm" variant="secondary" onClick={downloadCsv}>
                  <Download size={14} />
                  CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={downloadTxt}>
                  TXT
                </Button>
                <button
                  type="button"
                  onClick={() => setLastCreds([])}
                  className="text-xs text-zinc-600 hover:text-zinc-400 px-2 self-center"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lastCreds.map((c) => (
                <div
                  key={c.matric}
                  className="rounded-xl border border-white/10 bg-black/40 p-4 flex flex-col gap-2"
                >
                  <div>
                    <p className="font-semibold text-white text-sm">{c.fullName}</p>
                    <p className="text-[11px] font-mono text-zinc-500">{c.matric}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/20 px-3 py-2">
                    <p className="text-[9px] uppercase tracking-widest text-emerald-500/80 mb-0.5">
                      Temp password
                    </p>
                    <p className="font-mono text-lg font-bold text-emerald-300 tracking-wide">
                      {c.tempPassword}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full mt-auto"
                    isLoading={pdfLoading}
                    onClick={() => void downloadPdf([c])}
                  >
                    <FileText size={12} />
                    PDF (this student only)
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        <div className="flex gap-1 p-1 rounded-xl border border-white/8 bg-black/30 w-fit mb-6">
          {(
            [
              { id: "roster" as const, label: "Roster", icon: Users },
              { id: "add" as const, label: "Add student", icon: Plus },
              { id: "bulk" as const, label: "Bulk import", icon: Upload },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                tab === id
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "roster" ? (
            <motion.div
              key="roster"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/6">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search matric, name, program…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/8 text-sm text-white placeholder:text-zinc-600"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-sm text-zinc-300"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/6 text-[10px] uppercase tracking-wider text-zinc-600">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Program</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Security</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr
                        key={s.matric}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={s.displayName}
                              initials={s.avatar}
                              avatarUrl={s.avatarUrl}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-white">{s.displayName}</p>
                              <p className="text-xs text-zinc-600 font-mono">{s.matric}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs max-w-[140px] truncate">
                          {s.program}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              s.status === "active" && "text-emerald-400 border-emerald-400/30 bg-emerald-500/10",
                              s.status === "pending" && "text-amber-400 border-amber-400/30 bg-amber-500/10",
                              s.status === "suspended" && "text-red-400 border-red-400/30 bg-red-500/10"
                            )}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {s.mustChangePassword ? (
                            <span className="text-amber-400">Temp password</span>
                          ) : (
                            <span className="text-emerald-400/80">Password set</span>
                          )}
                          {s.lastLoginAt ? (
                            <p className="text-[10px] text-zinc-600 mt-0.5">
                              Last login {new Date(s.lastLoginAt).toLocaleDateString()}
                            </p>
                          ) : (
                            <p className="text-[10px] text-zinc-600 mt-0.5">Never signed in</p>
                          )}
                        </td>
                        <td className="px-4 py-3 relative z-10">
                          <div
                            className="flex justify-end gap-1.5 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              isLoading={actionMatric === s.matric && confirm?.type === "reset"}
                              disabled={!!actionMatric && actionMatric !== s.matric}
                              className="!h-7 !px-2 !text-[10px]"
                              onClick={() =>
                                setConfirm({
                                  type: "reset",
                                  matric: s.matric,
                                  name: s.displayName,
                                })
                              }
                            >
                              <KeyRound size={11} />
                              Reset temp
                            </Button>
                            {s.status !== "active" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="success"
                                isLoading={actionMatric === s.matric && confirm?.type === "activate"}
                                disabled={!!actionMatric && actionMatric !== s.matric}
                                className="!h-7 !px-2 !text-[10px]"
                                onClick={() =>
                                  setConfirm({
                                    type: "activate",
                                    matric: s.matric,
                                    name: s.displayName,
                                  })
                                }
                              >
                                <UserCheck size={11} />
                                Activate
                              </Button>
                            ) : null}
                            {s.status !== "suspended" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                isLoading={actionMatric === s.matric && confirm?.type === "suspend"}
                                disabled={!!actionMatric && actionMatric !== s.matric}
                                className="!h-7 !px-2 !text-[10px]"
                                onClick={() =>
                                  setConfirm({
                                    type: "suspend",
                                    matric: s.matric,
                                    name: s.displayName,
                                  })
                                }
                              >
                                <UserMinus size={11} />
                                Suspend
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-zinc-600 py-12">No students match.</p>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          {tab === "add" ? (
            <motion.form
              key="add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleAddStudent}
              className="max-w-lg rounded-2xl border border-white/10 bg-black/30 p-6 space-y-4"
            >
              <h2 className="text-lg font-semibold text-white">Add one student</h2>
              <Input
                label="Matric number"
                placeholder={MATRIC_FORMAT_HINT}
                value={addForm.matric}
                onChange={(e) => setAddForm({ ...addForm, matric: e.target.value })}
                required
              />
              <p className="text-[11px] text-zinc-600 -mt-2">{MATRIC_FORMAT_DESC}</p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last name"
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Program"
                value={addForm.program}
                onChange={(e) => setAddForm({ ...addForm, program: e.target.value })}
                required
              />
              <Input
                label="Email (optional)"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
              <Button type="submit" className="w-full">
                <Plus size={16} />
                Create & generate temp password
              </Button>
            </motion.form>
          ) : null}

          {tab === "bulk" ? (
            <motion.div
              key="bulk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-white/10 bg-black/30 p-6 max-w-2xl"
            >
              <h2 className="text-lg font-semibold text-white">Bulk import</h2>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Upload the CSV from your student intake site (
                <code className="text-zinc-400">student-data-collection</code> → records →
                Download all), or paste rows below. One student per line · {MATRIC_FORMAT_DESC}.
              </p>

              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".csv,.txt,.json,text/csv,text/plain,application/json"
                className="sr-only"
                onChange={handleBulkFileInput}
              />
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") bulkFileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setBulkDragOver(true);
                }}
                onDragLeave={() => setBulkDragOver(false)}
                onDrop={handleBulkDrop}
                onClick={() => bulkFileInputRef.current?.click()}
                className={cn(
                  "mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 cursor-pointer transition-colors",
                  bulkDragOver
                    ? "border-emerald-400/50 bg-emerald-500/10"
                    : "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                )}
              >
                <FileUp size={28} className="text-emerald-400/80" />
                <p className="text-sm font-medium text-white">Upload CSV or JSON file</p>
                <p className="text-[11px] text-zinc-500 text-center max-w-sm">
                  e.g. <span className="font-mono text-zinc-400">ula-students-bulk-batch-001.csv</span>{" "}
                  from GitHub Pages intake · drag & drop or click to browse
                </p>
                {bulkFileName ? (
                  <p className="text-xs text-emerald-400/90 mt-1">Loaded: {bulkFileName}</p>
                ) : null}
              </div>

              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-5 mb-2">
                Or paste manually
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  if (bulkFileName) setBulkFileName(null);
                }}
                rows={10}
                placeholder={`"U22/FNS/CSC/1107", Ada, Lovelace, B.Sc Computer Science\nU22-FNS-CSC-1108, Alan, Turing, B.Sc Software Engineering`}
                className="w-full rounded-xl bg-white/5 border border-white/8 px-4 py-3 text-sm text-white font-mono placeholder:text-zinc-700 resize-y"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={handleBulkImport}>
                  <Upload size={16} />
                  Import & generate credentials
                </Button>
                {bulkText ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setBulkText("");
                      setBulkFileName(null);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-10 inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400"
        >
          <ArrowLeft size={12} />
          Back to public site
        </button>
      </main>

      <AdminConfirmDialog
        open={!!confirm}
        title={
          confirm?.type === "reset"
            ? "Issue new temporary password?"
            : confirm?.type === "suspend"
              ? "Suspend this student?"
              : "Activate this student?"
        }
        message={
          confirm
            ? confirm.type === "reset"
              ? `${confirm.name} (${confirm.matric}) will receive a new temp password and must change it on next login. Download the PDF after confirming.`
              : confirm.type === "suspend"
                ? `${confirm.name} will not be able to sign in until reactivated.`
                : `${confirm.name} will be marked active and can sign in (if password is set).`
            : ""
        }
        confirmLabel={
          confirm?.type === "reset"
            ? "Reset password"
            : confirm?.type === "suspend"
              ? "Suspend"
              : "Activate"
        }
        variant={confirm?.type === "suspend" ? "danger" : "primary"}
        loading={!!actionMatric}
        onConfirm={runConfirmAction}
        onCancel={() => !actionMatric && setConfirm(null)}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white shadow-xl"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
