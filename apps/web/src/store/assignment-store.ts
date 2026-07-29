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
  enrollStudent: (assignmentId: string, matric: string) => void;
  startAssignment: (assignmentId: string, matric: string) => void;
  submitAssignment: (assignmentId: string, matric: string, score?: number, deployUrl?: string) => void;
  setEnrollmentDeployUrl: (assignmentId: string, matric: string, deployUrl: string) => void;
  publishAssignment: (assignmentId: string) => void;
  closeAssignment: (assignmentId: string) => void;
  deleteAssignment: (assignmentId: string) => void;
  createAssignment: (input: {
    title: string;
    description: string;
    instructions: string;
    deadline: string;
    maxScore: number;
    difficulty: Assignment["difficulty"];
    starterFiles?: ProjectFile[];
  }) => string;
  markEnrollmentGraded: (assignmentId: string, matric: string, score?: number) => void;
  getEnrollmentsForAssignment: (assignmentId: string) => StudentEnrollment[];
  pushActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  reopenAssignment: (assignmentId: string) => void;
  reopenEnrollment: (assignmentId: string, matric: string) => void;
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

      startAssignment: (assignmentId, matric) => {
        const norm = normalizeMatric(matric);
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
        const assignment = get().assignments.find((a) => a.id === assignmentId);
        get().pushActivity({
          type: "start",
          student: resolveStudentName(norm),
          matric: norm,
          message: `started ${assignment?.title ?? "assignment"}`,
        });
      },

      submitAssignment: (assignmentId, matric, score, deployUrl) => {
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
      },

      publishAssignment: (assignmentId) => {
        const roster = getClassRosterMatrics();
        set((s) => {
          const newEnrollments = [...s.enrollments];
          for (const matric of roster) {
            const exists = newEnrollments.some(
              (e) =>
                e.assignmentId === assignmentId &&
                normalizeMatric(e.studentMatric) === matric
            );
            if (!exists) {
              newEnrollments.push({
                assignmentId,
                studentMatric: matric,
                status: "NOT_STARTED",
              });
            }
          }
          return {
            assignments: s.assignments.map((a) =>
              a.id === assignmentId
                ? { ...a, status: "PUBLISHED" as const, enrolled: roster.length }
                : a
            ),
            enrollments: newEnrollments,
          };
        });
        const assignment = get().assignments.find((a) => a.id === assignmentId);
        get().pushActivity({
          type: "grade",
          student: "Lecturer",
          matric: "LEC",
          message: `published assignment: ${assignment?.title ?? assignmentId}`,
        });
      },

      createAssignment: (input) => {
        const roster = getClassRosterMatrics();
        const id = `asn-${Date.now()}`;
        const assignment: Assignment = {
          id,
          title: input.title,
          description: input.description,
          instructions: input.instructions,
          deadline: input.deadline,
          status: "DRAFT",
          maxScore: input.maxScore,
          difficulty: input.difficulty,
          engagement: "medium",
          enrolled: roster.length,
          submitted: 0,
          starterFiles: input.starterFiles,
        };
        set((s) => ({
          assignments: [assignment, ...s.assignments],
        }));

        // Create starter snapshots for all students in the class roster so
        // each student has a project scaffold accessible in My Projects.
        const starter = input.starterFiles && input.starterFiles.length ? input.starterFiles : BLANK_STARTER;
        for (const matric of roster) {
          // useProjectStore is imported at file top
          try {
            useProjectStore.getState().saveSnapshot(
              matric,
              id,
              assignment.title,
              starter
            );
          } catch (e) {
            // swallow snapshot errors — non-fatal for assignment creation
          }
        }
        return id;
      },

      markEnrollmentGraded: (assignmentId, matric) => {
        const norm = normalizeMatric(matric);
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.assignmentId === assignmentId && normalizeMatric(e.studentMatric) === norm
              ? { ...e, status: "GRADED" as const }
              : e
          ),
        }));
      },

      getEnrollmentsForAssignment: (assignmentId) =>
        get().enrollments.filter((e) => e.assignmentId === assignmentId),

      closeAssignment: (assignmentId) => {
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === assignmentId ? { ...a, status: "CLOSED" as const } : a
          ),
        }));
      },
          reopenAssignment: (assignmentId) => {
            set((s) => ({
              assignments: s.assignments.map((a) =>
                a.id === assignmentId ? { ...a, status: "PUBLISHED" as const } : a
              ),
            }));
          },

      reopenEnrollment: (assignmentId, matric) => {
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
      },

      deleteAssignment: (assignmentId) => {
        set((s) => ({
          assignments: s.assignments.filter((a) => a.id !== assignmentId),
          enrollments: s.enrollments.filter((e) => e.assignmentId !== assignmentId),
        }));
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
    { name: "ula-assignments" }
  )
);
