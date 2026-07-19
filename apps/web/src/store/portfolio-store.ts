"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PortfolioArtifact, PortfolioFeedEvent } from "@/types";
import {
  artifactSkills,
  formatProofHash,
  generatePortfolioHash,
} from "@/lib/portfolio-hash";
import { normalizeMatric } from "@/lib/matric";
import { resolveStudent } from "@/lib/student-directory";
import { useAssignmentStore } from "@/store/assignment-store";

const GRADIENTS = [
  "from-cyan-500/25 via-violet-500/20 to-emerald-500/15",
  "from-violet-500/30 via-fuchsia-500/15 to-cyan-500/20",
  "from-emerald-500/25 via-cyan-500/15 to-violet-600/20",
];

interface PortfolioState {
  artifacts: Record<string, PortfolioArtifact>;
  feed: PortfolioFeedEvent[];

  createFromSubmission: (input: {
    studentMatric: string;
    assignmentId: string;
    courseId: string;
    courseName: string;
    title: string;
    description?: string;
    score: number | null;
    maxScore: number;
    deployUrl?: string;
  }) => Promise<PortfolioArtifact>;

  updateDeploy: (artifactId: string, deployUrl: string) => void;
  verifyArtifact: (
    artifactId: string,
    lecturerId: string,
    lecturerName: string,
    approved: boolean,
    note?: string
  ) => void;

  getStudentArtifacts: (matric: string) => PortfolioArtifact[];
  getPendingVerification: () => PortfolioArtifact[];
  getFeed: () => PortfolioFeedEvent[];
  pushFeed: (event: Omit<PortfolioFeedEvent, "id" | "timestamp">) => void;
  syncToServer: (artifact: PortfolioArtifact) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      artifacts: {},
      feed: [],

      createFromSubmission: async (input) => {
        const matric = normalizeMatric(input.studentMatric);
        const student = resolveStudent(matric);
        const timestamp = new Date().toISOString();
        const hash = await generatePortfolioHash({
          studentMatric: matric,
          assignmentId: input.assignmentId,
          title: input.title,
          score: input.score,
          deployUrl: input.deployUrl,
          timestamp,
        });

        const existingKey = Object.values(get().artifacts).find(
          (a) =>
            normalizeMatric(a.studentMatric) === matric &&
            a.assignmentId === input.assignmentId
        )?.id;

        const id = existingKey ?? `art-${matric}-${input.assignmentId}-${Date.now()}`;
        const artifact: PortfolioArtifact = {
          id,
          studentMatric: matric,
          studentName: student.displayName,
          assignmentId: input.assignmentId,
          courseId: input.courseId,
          courseName: input.courseName,
          title: input.title,
          description: input.description,
          score: input.score,
          maxScore: input.maxScore,
          deployUrl: input.deployUrl,
          timestamp,
          submittedAt: timestamp,
          verified: false,
          hash,
          status: "SUBMITTED",
          skills: artifactSkills(input.title, input.courseId),
          thumbnailGradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
        };

        set((s) => ({
          artifacts: { ...s.artifacts, [id]: artifact },
        }));

        get().pushFeed({
          type: "portfolio",
          studentMatric: matric,
          studentName: student.displayName,
          title: input.title,
          message: `portfolio artifact sealed · ${formatProofHash(hash)}`,
          artifactId: id,
          score: input.score ?? undefined,
        });

        await get().syncToServer(artifact);
        return artifact;
      },

      updateDeploy: (artifactId, deployUrl) => {
        const a = get().artifacts[artifactId];
        if (!a) return;
        const updated = { ...a, deployUrl };
        set((s) => ({
          artifacts: { ...s.artifacts, [artifactId]: updated },
        }));
        get().pushFeed({
          type: "deploy",
          studentMatric: a.studentMatric,
          studentName: a.studentName,
          title: a.title,
          message: "live deployment linked to portfolio",
          artifactId,
        });
        get().syncToServer(updated);
      },

      verifyArtifact: (artifactId, lecturerId, lecturerName, approved, note) => {
        const a = get().artifacts[artifactId];
        if (!a) return;
        const updated: PortfolioArtifact = {
          ...a,
          verified: approved,
          status: approved ? "VERIFIED" : "REJECTED",
          verifiedAt: new Date().toISOString(),
          lecturerId,
          lecturerName,
          lecturerNote: note,
        };
        set((s) => ({
          artifacts: { ...s.artifacts, [artifactId]: updated },
        }));
        get().pushFeed({
          type: "verify",
          studentMatric: a.studentMatric,
          studentName: a.studentName,
          title: a.title,
          message: approved ? "lecturer verified artifact" : "artifact needs revision",
          artifactId,
          score: a.score ?? undefined,
        });
        get().syncToServer(updated);
        if (approved) {
          useAssignmentStore.getState().markEnrollmentGraded(a.assignmentId, a.studentMatric);
        }
        fetch("/api/portfolio/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artifactId,
            lecturerId,
            lecturerName,
            approved,
            note,
          }),
        }).catch(() => {});
      },

      getStudentArtifacts: (matric) => {
        const norm = normalizeMatric(matric);
        return Object.values(get().artifacts)
          .filter((a) => normalizeMatric(a.studentMatric) === norm)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      getPendingVerification: () =>
        Object.values(get().artifacts).filter(
          (a) => a.status === "SUBMITTED" && !a.verified
        ),

      getFeed: () => get().feed,

      pushFeed: (event) => {
        const entry: PortfolioFeedEvent = {
          ...event,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({ feed: [entry, ...s.feed].slice(0, 60) }));
      },

      syncToServer: async (artifact) => {
        try {
          await fetch("/api/portfolio/artifact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(artifact),
          });
        } catch {
          /* offline MVP */
        }
      },
    }),
    { name: "ula-vpe" }
  )
);
