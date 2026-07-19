"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Camera,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  FileBadge,
  KeyRound,
  Loader2,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { profilePath } from "@/lib/matric";
import { useAuthStore } from "@/store/auth-store";
import type { StudentSettings } from "@/types";
import { cn } from "@/lib/utils";

type TabId = "profile" | "security" | "certificate" | "notifications";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Identity", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "certificate", label: "Credential", icon: FileBadge },
  { id: "notifications", label: "Alerts", icon: Bell },
];

export function StudentSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const matric = user?.matricNumber ?? "";

  const [tab, setTab] = useState<TabId>("profile");
  const [settings, setSettings] = useState<StudentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [program, setProgram] = useState("");
  const [headline, setHeadline] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyGrades, setNotifyGrades] = useState(true);
  const [notifyPortfolio, setNotifyPortfolio] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  const applySettings = (s: StudentSettings) => {
    setSettings(s);
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setProgram(s.program);
    setHeadline(s.headline);
    setEmail(s.email);
    setNotifyAssignments(s.notifyAssignments);
    setNotifyGrades(s.notifyGrades);
    setNotifyPortfolio(s.notifyPortfolio);
    setPublicProfile(s.publicProfile);
  };

  /* Load once per matric — avoid updateUser in loop (was re-triggering fetch forever) */
  useEffect(() => {
    if (!matric) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/student/settings?matric=${encodeURIComponent(matric)}`);
        const data = await res.json();
        if (cancelled || !data.settings) return;

        applySettings(data.settings);

        const current = useAuthStore.getState().user;
        if (current && current.matricNumber === matric) {
          const patch: {
            avatarUrl?: string;
            program?: string;
            headline?: string;
          } = {};
          const curAvatar = current.avatarUrl?.split("?")[0];
          const nextAvatar = data.settings.avatarUrl?.split("?")[0];
          if (curAvatar !== nextAvatar) {
            patch.avatarUrl = data.settings.avatarUrl;
          }
          if (current.program !== data.settings.program) patch.program = data.settings.program;
          if (current.headline !== data.settings.headline) patch.headline = data.settings.headline;
          if (Object.keys(patch).length > 0) updateUser(patch);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when matric changes
  }, [matric]);

  const flash = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matric: user.matricNumber,
          program: program.trim(),
          headline: headline.trim(),
          email: email.trim(),
          notifyAssignments,
          notifyGrades,
          notifyPortfolio,
          publicProfile,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSettings(data.settings);
      updateUser({
        firstName: data.settings.firstName,
        lastName: data.settings.lastName,
        avatarUrl: data.settings.avatarUrl,
        program: data.settings.program,
        headline: data.settings.headline,
      });
      flash("ok", "Profile saved — certificate & public page updated.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("matric", user.matricNumber);
      form.append("file", file);
      const res = await fetch("/api/student/settings/avatar", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      const url = data.avatarUrl as string;
      updateUser({ avatarUrl: url });
      setSettings((s) => (s ? { ...s, avatarUrl: url, updatedAt: new Date().toISOString() } : s));
      flash("ok", "Photo uploaded — will appear on your credential.");
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await fetch(`/api/student/settings/avatar?matric=${user.matricNumber}`, {
        method: "DELETE",
      });
      updateUser({ avatarUrl: undefined });
      setSettings((s) => (s ? { ...s, avatarUrl: undefined } : s));
      flash("ok", "Photo removed.");
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setChangingPassword(true);
    try {
      const res = await fetch("/api/student/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matric: user.matricNumber,
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Password change failed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flash("ok", "Password updated successfully.");
    } catch (err) {
      flash("err", err instanceof Error ? err.message : "Password change failed");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  const displayName = `${firstName} ${lastName}`.trim() || settings?.displayName;
  const initials = settings?.avatar ?? user.firstName.slice(0, 1) + user.lastName.slice(0, 1);

  return (
    <div className="min-h-screen ula-mesh-bg ula-grid-pattern">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Workspace
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80 font-medium">
                Student command center
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Settings
              </h1>
            </div>
          </div>
          <AnimatePresence>
            {message ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border",
                  message.type === "ok"
                    ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-300"
                    : "bg-red-500/10 border-red-400/25 text-red-300"
                )}
              >
                {message.text}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <nav className="ula-glass rounded-2xl p-2 h-fit lg:sticky lg:top-8">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  tab === id
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white border border-cyan-400/20 shadow-lg shadow-cyan-500/5"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                )}
              >
                <Icon size={16} className={tab === id ? "text-cyan-400" : ""} />
                {label}
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {loading ? (
              <div className="ula-glass rounded-2xl p-16 flex items-center justify-center gap-3 text-zinc-500">
                <Loader2 className="animate-spin" size={20} />
                Loading your identity…
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === "profile" ? (
                    <div className="space-y-6">
                      <div className="ula-glass rounded-3xl p-8 relative overflow-hidden border border-white/8">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-violet-600/10 pointer-events-none" />
                        <div className="relative flex flex-col md:flex-row gap-8 items-center md:items-start">
                          <div className="relative group">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 opacity-60 blur-md group-hover:opacity-80 transition-opacity" />
                            <UserAvatar
                              name={displayName ?? ""}
                              initials={initials}
                              avatarUrl={settings?.avatarUrl}
                              size="xl"
                              className="relative ring-4 ring-[#0a0a0f]"
                            />
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              disabled={uploading}
                              className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 flex items-center justify-center text-white border-2 border-[#0a0a0f] shadow-lg hover:scale-105 transition-transform"
                            >
                              {uploading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Camera size={14} />
                              )}
                            </button>
                            <input
                              ref={fileRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadPhoto(f);
                                e.target.value = "";
                              }}
                            />
                          </div>
                          <div className="flex-1 text-center md:text-left">
                            <h2 className="text-xl font-bold text-white">{displayName}</h2>
                            <p className="text-sm text-cyan-400/90 font-mono mt-1">
                              {user.matricNumber}
                            </p>
                            <p className="text-sm text-zinc-500 mt-3 max-w-md">
                              Your photo appears on the{" "}
                              <strong className="text-zinc-400">printed IBBUL ULA credential</strong>
                              , public portfolio, and workspace. Name is locked to your matric —
                              cannot be changed to another student.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                              >
                                <Camera size={14} />
                                Upload photo
                              </Button>
                              {settings?.avatarUrl ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={removePhoto}
                                  disabled={uploading}
                                >
                                  <Trash2 size={14} />
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-zinc-600 mt-2">
                              JPEG, PNG, WebP · max 2MB · square photos work best
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="ula-glass rounded-2xl p-6 md:p-8 border border-white/8">
                        <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                          <Sparkles size={14} className="text-cyan-400" />
                          Profile details
                        </h3>
                        <p className="text-xs text-amber-400/80 mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-400/15">
                          Legal name is bound to your matric ({user.matricNumber}) and cannot be
                          changed here — prevents credential fraud.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Input label="First name" value={firstName} readOnly disabled />
                          <Input label="Last name" value={lastName} readOnly disabled />
                          <Input
                            label="Program"
                            value={program}
                            onChange={(e) => setProgram(e.target.value)}
                            className="sm:col-span-2"
                          />
                          <Input
                            label="Headline"
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            className="sm:col-span-2"
                            placeholder="Verified builder · Live deployable work"
                          />
                          <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="sm:col-span-2"
                          />
                        </div>
                        <div className="mt-6 flex justify-end">
                          <Button onClick={saveProfile} isLoading={saving}>
                            <Check size={14} />
                            Save profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "security" ? (
                    <div className="ula-glass rounded-2xl p-6 md:p-8 border border-white/8 max-w-xl">
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <KeyRound size={14} className="text-cyan-400" />
                        Change password
                      </h3>
                      <p className="text-xs text-zinc-500 mb-6">
                        Use at least 8 characters. Your password is stored securely on the ULA
                        platform — never shared on certificates.
                      </p>
                      <form onSubmit={changePassword} className="space-y-4">
                        <div className="relative">
                          <Input
                            label="Current password"
                            type={showPasswords ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Input
                          label="New password"
                          type={showPasswords ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <Input
                          label="Confirm new password"
                          type={showPasswords ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                        >
                          {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
                          {showPasswords ? "Hide" : "Show"} passwords
                        </button>
                        <Button type="submit" isLoading={changingPassword} className="w-full sm:w-auto">
                          Update password
                        </Button>
                      </form>
                    </div>
                  ) : null}

                  {tab === "certificate" ? (
                    <div className="ula-glass rounded-2xl p-6 md:p-8 border border-white/8">
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <FileBadge size={14} className="text-emerald-400" />
                        Credential preview
                      </h3>
                      <div className="rounded-2xl border border-white/10 bg-white p-6 max-w-md mx-auto text-center shadow-2xl">
                        <p className="text-[8px] uppercase tracking-widest text-slate-400 mb-2">
                          IBBUL ULA
                        </p>
                        <UserAvatar
                          name={displayName ?? ""}
                          initials={initials}
                          avatarUrl={settings?.avatarUrl}
                          size="cert"
                          className="mx-auto mb-3 !rounded-full"
                        />
                        <p className="text-lg font-serif text-slate-900">{displayName}</p>
                        <p className="text-xs font-mono text-cyan-700 mt-1">{user.matricNumber}</p>
                        <p className="text-[10px] text-slate-500 mt-2">{program}</p>
                      </div>
                      <p className="text-sm text-zinc-500 mt-6 text-center max-w-lg mx-auto">
                        Upload a professional headshot in <strong className="text-zinc-400">Identity</strong>.
                        Print your credential from your public portfolio when ready.
                      </p>
                      <div className="flex justify-center gap-3 mt-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(profilePath(user.matricNumber))}
                        >
                          <ExternalLink size={14} />
                          Public profile
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {tab === "notifications" ? (
                    <div className="ula-glass rounded-2xl p-6 md:p-8 border border-white/8 space-y-4">
                      <h3 className="text-sm font-semibold text-white mb-4">Notification preferences</h3>
                      {[
                        {
                          key: "assignments",
                          label: "Assignment updates",
                          desc: "New tasks, deadlines, and class publishes",
                          value: notifyAssignments,
                          set: setNotifyAssignments,
                        },
                        {
                          key: "grades",
                          label: "Grades & feedback",
                          desc: "Scores and lecturer verification",
                          value: notifyGrades,
                          set: setNotifyGrades,
                        },
                        {
                          key: "portfolio",
                          label: "Portfolio & VPE",
                          desc: "Artifact seals and deploy activity",
                          value: notifyPortfolio,
                          set: setNotifyPortfolio,
                        },
                        {
                          key: "public",
                          label: "Public portfolio",
                          desc: "Allow employers to view /u/{matric}",
                          value: publicProfile,
                          set: setPublicProfile,
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-black/20 border border-white/6 cursor-pointer hover:border-white/10 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{item.label}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={item.value}
                            onChange={(e) => item.set(e.target.checked)}
                            className="h-5 w-5 rounded accent-cyan-500"
                          />
                        </label>
                      ))}
                      <div className="pt-4 flex justify-end">
                        <Button onClick={saveProfile} isLoading={saving}>
                          Save preferences
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
