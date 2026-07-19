import { matricToApiSegment } from "@/lib/matric";

/** Build admin API path — matric slashes must be encoded or routing breaks */
export function adminStudentApiPath(matric: string, suffix = ""): string {
  const base = `/api/admin/students/${matricToApiSegment(matric)}`;
  return suffix ? `${base}/${suffix.replace(/^\//, "")}` : base;
}
