"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Assignment, ActivityEvent, StudentEnrollment, ProjectFile } from "@/types";
import {
  INITIAL_ASSIGNMENTS,
  STARTER_FILES,
  BLANK_STARTER,
} from "@/lib/mock-data";
import { getClassRosterMatrics } from "@/lib/class-roster";
import { normalizeMatric } from "@/lib/matric";
import { resolveStudent } from "@/lib/student-directory";
import { useProjectStore } from "@/store/project-store";

function resolveStudentName(matric: string) {
  return resolveStudent(normalizeMatric(matric)).displayName;
}

interface AssignmentState {
  assignments: Assignment[];
  enrollments: StudentEnrollment[];
  activityFeed: ActivityEvent[];
  activeClassId: string;
  filterRisk: "all" | "watch" | "critical";

  getPublishedAssignments: () => Assignment[];
  getStudentAssignments: (matric: string) => (Assignment & { enrollment: StudentEnrollment | null })[];
  mergeAssignments: (assignments: Assignment[], enrollments?: StudentEnrollment[]) => void;
  loadAssignments: () => Promise<void>;
  loadStudentAssignments: (matric: string) => Promise<void>;
  enrollStudent: (assignmentId: string, matric: string) => void;
  startAssignment: (assignmentId: string, matric: string) => Promise<void>;
  submitAssignment: (assignmentId: string, matric: string, score?: number, deployUrl?: string) => Promise<void>;
  setEnrollmentDeployUrl: (assignmentId: string, matric: string, deployUrl: string) => void;
  publishAssignment: (assignmentId: string) => Promise<void>;
  closeAssignment: (assignmentId: string) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  createAssignment: (input: {
    title: string;
    description: string;
    instructions: string;
    deadline: string;
    maxScore: number;
    difficulty: Assignment["difficulty"];
    starterFiles?: ProjectFile[];
  }) => Promise<string | undefined>;
  markEnrollmentGraded: (assignmentId: string, matric: string, score?: number) => Promise<void>;
  getEnrollmentsForAssignment: (assignmentId: string) => StudentEnrollment[];
  pushActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  reopenAssignment: (assignmentId: string) => Promise<void>;
  reopenEnrollment: (assignmentId: string, matric: string) => Promise<void>;
  setFilterRisk: (filter: "all" | "watch" | "critical") => void;
  setActiveClassId: (id: string) => void;
}

export const useAssignmentStore = create<AssignmentState>()(
  persist(
    (set, get) => ({
      assignments: INITIAL_ASSIGNMENTS,
      enrollments: [
        { assignmentId: "asn-1", studentMatric: "U22/FNS/CSC/1101", status: "IN_PROGRESS", startedAt: new Date().toISOString() },
      ],
      activityFeed: [],
      activeClassId: "CS101-WebDev",
      filterRisk: "all",

      getPublishedAssignments: () =>
        get().assignments.filter((a) => a.status === "PUBLISHED"),

      mergeAssignments: (assignments, enrollments) => {
        if (Array.isArray(assignments)) {
          set(() => ({ assignments }));
        }
        if (Array.isArray(enrollments)) {
          set(() => ({ enrollments }));
        }
      },

      loadAssignments: async () => {
        try {
          const res = await fetch("/api/assignments");
          if (!res.ok) return;
          const data = await res.json();
          if (!data || !Array.isArray(data.assignments)) return;
          const assignments = data.assignments;
          const enrollments = assignments.flatMap((a: any) => (Array.isArray(a.enrollments) ? a.enrollments : []));
          get().mergeAssignments(assignments, enrollments);
        } catch (e) {
          // ignore
        }
      },

      loadStudentAssignments: async (matric) => {
        try {
          await get().loadAssignments();
        } catch (e) {
          // ignore
        }
      },

      getStudentAssignments: (matric) => {
        const norm = normalizeMatric(matric);
        const { assignments, enrollments } = get();
        const safeAssignments = Array.isArray(assignments) ? assignments : [];
        const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];
        return safeAssignments
          .filter((a) => a.status === "PUBLISHED")
          .map((a) => ({
            ...a,
            enrollment: safeEnrollments.find(
              (e) => e.assignmentId === a.id && normalizeMatric(e.studentMatric) === norm
            ) ?? null,
          }));
      },

      enrollStudent: (assignmentId, matric) => {
        // Enroll on client for optimistic UI; server enrollments handled via publish or enrollments API
        const norm = normalizeMatric(matric);
        const exists = get().enrollments.some(
          (e) => e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
        );
        if (exists) return;
        set((s) => ({
          enrollments: [
            ...s.enrollments,
            { assignmentId, studentMatric: norm, status: "NOT_STARTED" },
          ],
        }));
      },

      startAssignment: async (assignmentId, matric) => {
        const norm = normalizeMatric(matric);
        // Optimistic update
        set((s) => ({
          enrollments: s.enrollments.some(
            (e) => e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
          )
            ? s.enrollments.map((e) =>
                e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
                  ? { ...e, studentMatric: norm, status: "IN_PROGRESS" as const, startedAt: new Date().toISOString() }
                  : e
              )
            : [
                ...s.enrollments,
                {
                  assignmentId,
                  studentMatric: norm,
                  status: "IN_PROGRESS" as const,
                  startedAt: new Date().toISOString(),
                },
              ],
        }));
        get().pushActivity({
          type: "start",
          student: resolveStudentName(norm),
          matric: norm,
          message: `started ${get().assignments.find((a) => a.id === assignmentId)?.title ?? "assignment"}`,
        });
        try {
          const res = await fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId, studentMatric: norm, action: "start" }),
          });
          if (res.ok) {
            const d = await res.json();
            const enrollment = d.enrollment;
            if (enrollment) set((s) => ({ enrollments: [...s.enrollments.filter((e) => e.id !== enrollment.id), enrollment] }));
          }
        } catch (e) {
          // ignore
        }
      },

      submitAssignment: async (assignmentId, matric, score, deployUrl) => {
        const norm = normalizeMatric(matric);
        const snap = useProjectStore.getState().getSnapshot(norm, assignmentId);
        const resolvedDeploy = deployUrl ?? snap?.deployUrl;
        set((s) => {
          const hasEnrollment = s.enrollments.some(
            (e) => e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
          );
          const enrollments = hasEnrollment
            ? s.enrollments.map((e) =>
                e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
                  ? {
                      ...e,
                      studentMatric: norm,
                      status: "SUBMITTED" as const,
                      submittedAt: new Date().toISOString(),
                      score,
                      deployUrl: resolvedDeploy ?? e.deployUrl,
                    }
                  : e
              )
            : [
                ...s.enrollments,
                {
                  assignmentId,
                  studentMatric: norm,
                  status: "SUBMITTED" as const,
                  submittedAt: new Date().toISOString(),
                  score,
                  deployUrl: resolvedDeploy,
                },
              ];
          return { enrollments };
        });
        const assignment = get().assignments.find((a) => a.id === assignmentId);
        get().pushActivity({
          type: "submit",
          student: resolveStudentName(norm),
          matric: norm,
          message: `submitted ${assignment?.title ?? "assignment"}`,
        });
        try {
          const res = await fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId, studentMatric: norm, action: "submit", score, deployUrl: resolvedDeploy }),
          });
          if (res.ok) {
            const d = await res.json();
            const enrollment = d.enrollment;
            if (enrollment) set((s) => ({ enrollments: [...s.enrollments.filter((e) => e.id !== enrollment.id), enrollment] }));
          }
        } catch (e) {
          // ignore
        }
      },

      setEnrollmentDeployUrl: (assignmentId, matric, deployUrl) => {
        const norm = normalizeMatric(matric);
        set((s) => ({
          enrollments: s.enrollments.some(
            (e) => e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
          )
            ? s.enrollments.map((e) =>
                e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
                  ? { ...e, studentMatric: norm, deployUrl }
                  : e
              )
            : [
                ...s.enrollments,
                {
                  assignmentId,
                  studentMatric: norm,
                  status: "IN_PROGRESS" as const,
                  deployUrl,
                },
              ],
        }));
        (async () => {
          try {
            const res = await fetch("/api/enrollments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ assignmentId, studentMatric: norm, action: "setDeploy", deployUrl }),
            });
            if (res.ok) {
              const d = await res.json();
              const enrollment = d.enrollment;
              if (enrollment)
                set((s) => ({
                  enrollments: [...s.enrollments.filter((e) => e.id !== enrollment.id), enrollment],
                }));
            }
          } catch (e) {
            // ignore
          }
        })();
      },

      publishAssignment: async (assignmentId) => {
        try {
          const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}/publish`, { method: "POST" });
          if (!res.ok) return;
          const d = await res.json();
          if (d.assignment) {
            const assignment = d.assignment;
            const enrollments = Array.isArray(d.enrollments) ? d.enrollments : [];
            set((s) => ({
              assignments: s.assignments.map((a) => (a.id === assignment.id ? assignment : a)),
              enrollments: [
                ...s.enrollments.filter((e) => e.assignmentId !== assignment.id),
                ...enrollments,
              ],
            }));
            await get().loadAssignments();
          }
        } catch (e) {
          // ignore
        }
      },

      createAssignment: async (input) => {
        const roster = getClassRosterMatrics();
        try {
          const res = await fetch("/api/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: input.title,
              description: input.description,
              instructions: input.instructions,
              deadline: input.deadline,
              maxScore: input.maxScore,
              difficulty: input.difficulty,
              starterFiles: input.starterFiles,
            }),
          });
          if (!res.ok) return undefined;
          const data = await res.json();
          const assignment = data.assignment as Assignment | undefined;
          if (!assignment) return undefined;

          set((s) => ({ assignments: [assignment, ...s.assignments] }));
          const starter = input.starterFiles && input.starterFiles.length ? input.starterFiles : BLANK_STARTER;
          for (const matric of roster) {
            try {
              useProjectStore.getState().saveSnapshot(
                matric,
                assignment.id,
                assignment.title,
                starter
              );
            } catch (e) {
              // swallow snapshot errors — non-fatal for assignment creation
            }
          }
          return assignment.id;
        } catch (e) {
          return undefined;
        }
      },

      markEnrollmentGraded: async (assignmentId, matric, score) => {
        const norm = normalizeMatric(matric);
        // optimistic update
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
              ? { ...e, status: "GRADED" as const, score }
              : e
          ),
        }));
        try {
          const res = await fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId, studentMatric: norm, action: "grade", score }),
          });
          if (res.ok) {
            const d = await res.json();
            const enrollment = d.enrollment;
            if (enrollment) set((s) => ({ enrollments: [...s.enrollments.filter((e) => e.id !== enrollment.id), enrollment] }));
          }
        } catch (e) {
          // ignore
        }
      },

      getEnrollmentsForAssignment: (assignmentId) =>
        get().enrollments.filter((e) => e.assignmentId === assignmentId),

      closeAssignment: async (assignmentId) => {
        try {
          const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CLOSED" }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const updated = data.assignment;
          if (updated) {
            set((s) => ({ assignments: s.assignments.map((a) => (a.id === updated.id ? updated : a)) }));
          }
        } catch (e) {
          set((s) => ({
            assignments: s.assignments.map((a) =>
              a.id === assignmentId ? { ...a, status: "CLOSED" as const } : a
            ),
          }));
        }
      },
      reopenAssignment: async (assignmentId) => {
        try {
          const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "PUBLISHED" }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const updated = data.assignment;
          if (updated) {
            set((s) => ({ assignments: s.assignments.map((a) => (a.id === updated.id ? updated : a)) }));
          }
        } catch (e) {
          set((s) => ({
            assignments: s.assignments.map((a) =>
              a.id === assignmentId ? { ...a, status: "PUBLISHED" as const } : a
            ),
          }));
        }
      },

      reopenEnrollment: async (assignmentId, matric) => {
        const norm = normalizeMatric(matric);
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
              ? {
                  ...e,
                  studentMatric: norm,
                  status: "IN_PROGRESS" as const,
                  submittedAt: undefined,
                  score: undefined,
                }
              : e
          ),
        }));
        try {
          await fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignmentId, studentMatric: norm, status: "IN_PROGRESS" }),
          });
        } catch (e) {
          // ignore
        }
      },

      deleteAssignment: async (assignmentId) => {
        try {
          const res = await fetch(`/api/assignments/${encodeURIComponent(assignmentId)}`, {
            method: "DELETE",
          });
          if (!res.ok) return;
          set((s) => ({
            assignments: s.assignments.filter((a) => a.id !== assignmentId),
            enrollments: s.enrollments.filter((e) => e.assignmentId !== assignmentId),
          }));
        } catch (e) {
          set((s) => ({
            assignments: s.assignments.filter((a) => a.id !== assignmentId),
            enrollments: s.enrollments.filter((e) => e.assignmentId !== assignmentId),
          }));
        }
        // Note: project snapshots are not removed to avoid mutating persisted
        // project store directly in this helper. Snapshots can be cleaned up
        // separately if needed.
      },

      setActiveClassId: (id) => set({ activeClassId: id }),

      pushActivity: (event) => {
        const newEvent: ActivityEvent = {
          ...event,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        set((s) => {
          const recent = s.activityFeed.slice(0, 8);
          const dup = recent.some(
            (e) =>
              e.matric === newEvent.matric &&
              e.type === newEvent.type &&
              e.message === newEvent.message
          );
          if (dup) return s;
          return {
            activityFeed: [newEvent, ...s.activityFeed].slice(0, 28),
          };
        });
        // Attempt to resolve a real student display name from server
        (async () => {
          try {
            const norm = normalizeMatric(newEvent.matric);
            const res = await fetch(`/api/portfolio/${encodeURIComponent(norm)}`);
            if (!res.ok) return;
            const data = await res.json();
            const display = data?.profile?.displayName;
            if (display) {
              set((s) => ({
                activityFeed: s.activityFeed.map((e) => (e.id === newEvent.id ? { ...e, student: display } : e)),
              }));
            }
          } catch (e) {
            // ignore network errors
          }
        })();
      },

      setFilterRisk: (filter) => set({ filterRisk: filter }),
    }),
    {
      name: "ula-assignments",
      partialize: (state) => ({
        activeClassId: state.activeClassId,
        filterRisk: state.filterRisk,
      }),
    }
  )
);
