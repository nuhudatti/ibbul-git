"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { getClassRosterMatrics } from "@/lib/class-roster";
import { resolveStudent } from "@/lib/student-directory";
import { normalizeMatric } from "@/lib/matric";

type LecturerStudentSubmission = {
  assignmentId: string;
  assignmentTitle: string;
  assignmentStatus: string;
  enrollment: {
    submittedAt?: string | null;
  };
  review: {
    id: string;
    status: string;
    submittedAt?: string | null;
    updatedAt?: string | null;
  } | null;
};

type LecturerStudentSummary = {
  matric: string;
  displayName: string;
  avatar: string;
  program: string;
  submissions: LecturerStudentSubmission[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function DashboardStudentListPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [students, setStudents] = useState<LecturerStudentSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "LECTURER") {
      router.replace("/");
      return;
    }

    const loadStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dashboard/students");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load student roster");
        }
        setStudents(Array.isArray(payload.students) ? payload.students : []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadStudents();
  }, [user, router]);

  const roster = useMemo(() => getClassRosterMatrics(), []);
  const studentsWithRoster = useMemo(
    () => roster.map((matric) => ({ matric, student: resolveStudent(matric) })),
    [roster]
  );

  const allStudents = useMemo(() => {
    const studentMap = new Map(students.map((student) => [normalizeMatric(student.matric), student]));
    return studentsWithRoster.map((candidate) =>
      studentMap.get(normalizeMatric(candidate.matric)) ?? {
        matric: normalizeMatric(candidate.matric),
        displayName: candidate.student.displayName,
        avatar: candidate.student.avatar,
        program: candidate.student.program,
        submissions: [],
      }
    );
  }, [students, studentsWithRoster]);

  const visibleStudents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allStudents;

    return allStudents
      .filter((student) =>
        [student.matric, student.displayName, student.program].some((value) =>
          value.toLowerCase().includes(needle)
        )
      )
      .sort((a, b) => b.submissions.length - a.submissions.length);
  }, [query, allStudents]);

  const filteredStudents = visibleStudents;

  return (
    <main className="ula-mesh-bg min-h-screen px-4 py-6 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-370">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              <ShieldCheck size={15} /> Lecturer student review roster
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Student review workflow</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Start by selecting a student to review all submitted projects and session history in one place.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm text-zinc-300">
            <span>{filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}</span>
          </div>
        </header>

        <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            aria-label="Search students"
            placeholder="Search student name, matric, or program"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11"
          />
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-12 text-center text-sm text-zinc-500">
            Loading students…
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && filteredStudents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-14 text-center">
            <Search className="mx-auto mb-3 text-zinc-600" size={24} />
            <p className="text-sm text-zinc-400">No students match this search.</p>
          </div>
        ) : null}

        {!loading && !error && filteredStudents.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-2xl shadow-black/20">
            <div className="hidden grid-cols-[1fr_160px_160px_160px_96px] gap-4 border-b border-white/8 px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600 md:grid">
              <span>Student</span>
              <span>Submissions</span>
              <span>In review</span>
              <span>Latest status</span>
              <span />
            </div>
            {filteredStudents.map((student, index) => {
              const activeReviews = student.submissions.filter((submission) =>
                submission.review
                  ? ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED"].includes(submission.review.status)
                  : false
              );

              const latestReview = [...student.submissions]
                .map((submission) => submission.review)
                .filter(Boolean)
                .sort((a, b) => {
                  const aTime = new Date(a?.updatedAt ?? a?.submittedAt ?? 0).getTime();
                  const bTime = new Date(b?.updatedAt ?? b?.submittedAt ?? 0).getTime();
                  return bTime - aTime;
                })[0];

              return (
                <Link
                  key={student.matric}
                  href={`/dashboard/students/${encodeURIComponent(normalizeMatric(student.matric))}`}
                  className={cn(
                    "grid w-full gap-3 border-b border-white/8 px-5 py-4 text-left no-underline transition-colors hover:bg-white/4.5 md:grid-cols-[1fr_160px_160px_160px_96px] md:items-center md:gap-4",
                    index === filteredStudents.length - 1 ? "border-b-0" : ""
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-sm font-semibold text-cyan-200">
                        {student.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{student.displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{student.matric}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-200">{student.submissions.length}</p>
                    <p className="text-xs text-zinc-500">submitted</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-200">{activeReviews.length}</p>
                    <p className="text-xs text-zinc-500">active reviews</p>
                  </div>
                  <div>
                    {latestReview ? (
                      <p className="truncate text-sm text-white">{latestReview.status.replace(/_/g, " ")}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Awaiting review</p>
                    )}
                    <p className="text-xs text-zinc-500">{formatDate(latestReview?.updatedAt ?? latestReview?.submittedAt)}</p>
                  </div>
                  <div className="flex items-center justify-end text-cyan-300">
                    <ChevronRight size={18} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
