import { normalizeMatric } from "@/lib/matric";

export const STUDENT_DIRECTORY: Record<
  string,
  { displayName: string; avatar: string; program: string }
> = {
  "U22/FNS/CSC/1101": {
    displayName: "Nuhu Ibrahim",
    avatar: "NI",
    program: "B.Sc Computer Science",
  },
  "U22/FNS/CSC/1102": {
    displayName: "Amina Yusuf",
    avatar: "AY",
    program: "B.Sc Computer Science",
  },
  "U22/FNS/CSC/1103": {
    displayName: "Chidi Okafor",
    avatar: "CO",
    program: "B.Sc Software Engineering",
  },
  "U22/FNS/CSC/1104": {
    displayName: "Fatima Bello",
    avatar: "FB",
    program: "B.Sc Information Technology",
  },
  "U22/FNS/CSC/1105": {
    displayName: "Emeka Nwosu",
    avatar: "EN",
    program: "B.Sc Computer Science",
  },
  "U22/FNS/CSC/1106": {
    displayName: "Zainab Ahmed",
    avatar: "ZA",
    program: "B.Sc Cyber Security",
  },
};

export function registerStudentInDirectory(
  matric: string,
  entry: { displayName: string; avatar: string; program: string }
) {
  STUDENT_DIRECTORY[normalizeMatric(matric)] = entry;
}

export function getDirectoryMatrics(): string[] {
  return Object.keys(STUDENT_DIRECTORY);
}

/** @deprecated use resolveStudentProfile from student-profile-server on server */
export function resolveStudent(matric: string) {
  const norm = normalizeMatric(matric);
  return (
    STUDENT_DIRECTORY[norm] ?? {
      displayName: norm,
      avatar: norm.replace(/\//g, "").slice(0, 2) || "UL",
      program: "ULA Scholar",
    }
  );
}
