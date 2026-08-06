"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, ClipboardCheck, Filter, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

type SubmissionItem = {
  studentMatric: string;
  student: { matric: string; displayName: string; avatar: string; program: string } | null;
  assignmentId: string;
  assignmentTitle: string;
  assignmentStatus: string;
  enrollment: {
    id?: string;
    status: string;
    submittedAt?: string | null;
    score?: number | null;
    deployUrl?: string | null;
  };
  snapshot: {
    id: string;
    projectName: string;
    files: Array<{ path?: string; content?: string; language?: string }>;
    submittedAt?: string | null;
    deployUrl?: string | null;
  } | null;
  review: {
    id: string;
    status: Status;
    submittedAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    title: string;
    summary: string | null;
    reviewerName: string | null;
    projectSnapshotId: string | null;
    revisions?: Array<{ revisionNumber: number }>;
  } | null;
  statusLabel: string;
  actionLabel: string;
  actionType: "review" | "view" | "continue";
};

const statuses: Array<{ value: "ALL" | string; label: string }> = [
  { value: "ALL", label: "All submissions" },
  { value: "Awaiting review", label: "Awaiting review" },
  { value: "Submitted", label: "Submitted" },
  { value: "Under review", label: "Under review" },
  { value: "Changes requested", label: "Changes requested" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "In review", label: "In review" },
];

const statusLabel: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

function formatDate(value: string | null) {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
        {
          "border-cyan-400/25 bg-cyan-400/10 text-cyan-300":
            status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "RESUBMITTED",
          "border-amber-400/25 bg-amber-400/10 text-amber-300": status === "CHANGES_REQUESTED",
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-300":
            status === "APPROVED" || status === "PUBLISHED",
          "border-red-400/25 bg-red-400/10 text-red-300": status === "REJECTED",
          "border-white/10 bg-white/5 text-zinc-400": status === "DRAFT",
        }
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

export default function DashboardReviewQueuePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "LECTURER") {
      router.replace("/");
      return;
    }

    const loadReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dashboard/submissions");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load submissions");
        }
        setSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadReviews();
  }, [user, router]);

  const filteredReviews = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const effectiveStatus = submission.statusLabel;
      if (filter !== "ALL" && effectiveStatus !== filter) return false;
      if (!needle) return true;
      const name = submission.student?.displayName ?? "";
      return [submission.assignmentTitle, submission.studentMatric, name].some((field) =>
        field.toLowerCase().includes(needle)
      );
    });
  }, [filter, query, submissions]);

  return (
    <main className="ula-mesh-bg min-h-screen px-4 py-6 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-370">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              <ShieldCheck size={15} /> Lecturer review queue
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Review student work</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Review submissions, leave feedback, and keep every revision visible inside the lecturer dashboard.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-zinc-300">
            <Bell size={16} className={filteredReviews.length > 0 ? "text-cyan-300" : "text-zinc-500"} />
            <span>{filteredReviews.length} review{filteredReviews.length === 1 ? "" : "s"} visible</span>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            aria-label="Search reviews"
            placeholder="Search student, matric number, or project title"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11"
          />
          <label className="relative">
            <Filter size={15} className="pointer-events-none absolute left-3 top-3.5 text-zinc-500" />
            <select
              aria-label="Filter reviews by status"
              value={filter}
              onChange={(event) => setFilter(event.target.value as "ALL" | string)}
              className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/4 pl-9 pr-3 text-sm text-zinc-200 outline-none focus:border-cyan-400/50"
            >
              {statuses.map((item) => (
                <option key={item.value} value={item.value} className="bg-zinc-900">
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
          <span>{filteredReviews.length} review{filteredReviews.length === 1 ? "" : "s"}</span>
          <span className="hidden sm:inline">Sorted by latest activity</span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-12 text-center text-sm text-zinc-500">
            Loading review queue...
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-14 text-center">
            <Search className="mx-auto mb-3 text-zinc-600" size={24} />
            <p className="text-sm text-zinc-400">No reviews match this view.</p>
          </div>
        ) : null}

        {!loading && !error && filteredReviews.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl shadow-black/20">
            <div className="hidden grid-cols-[minmax(260px,1.5fr)_1fr_150px_110px_150px_36px] gap-4 border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600 md:grid">
              <span>Project</span>
              <span>Student</span>
              <span>Submitted</span>
              <span>Revision</span>
              <span>Status</span>
              <span />
            </div>
            {filteredReviews.map((submission) => {
              const studentName = submission.student?.displayName ?? "Unknown student";
              const revision = submission.review?.revisions?.[0]?.revisionNumber ?? 1;
              const reviewId = submission.review?.id ?? null;
              return (
                <button
                  key={`${submission.studentMatric}-${submission.assignmentId}`}
                  type="button"
                  onClick={() => router.push(reviewId ? `/dashboard/reviews/${reviewId}` : `/dashboard/students/${encodeURIComponent(submission.studentMatric)}`)}
                  className="grid w-full gap-3 border-b border-white/8 px-5 py-4 text-left transition-colors last:border-0 hover:bg-white/4.5 md:grid-cols-[minmax(260px,1.5fr)_1fr_150px_110px_150px_36px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={15} className="shrink-0 text-cyan-300" />
                      <span className="truncate font-medium text-white">{submission.assignmentTitle}</span>
                    </div>
                    <div className="mt-1 pl-6 text-xs text-zinc-500">
                      {submission.assignmentId} · active {formatDate(submission.review?.updatedAt ?? submission.enrollment.submittedAt ?? null)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-200">{studentName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{submission.studentMatric}</p>
                  </div>
                  <div className="text-sm text-zinc-400">{formatDate(submission.enrollment.submittedAt ?? submission.review?.createdAt ?? null)}</div>
                  <div className="text-sm text-zinc-400">R{revision}</div>
                  <div>
                    <StatusPill status={(submission.review?.status ?? "SUBMITTED") as Status} />
                  </div>
                  <ChevronRight size={17} className="hidden text-zinc-600 md:block" />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
