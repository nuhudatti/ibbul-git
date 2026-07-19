import { normalizeMatric } from "@/lib/matric";

export type BulkImportRow = {
  matric: string;
  firstName: string;
  lastName: string;
  program?: string;
  email?: string;
};

export function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

/** Parse bulk CSV/text from student-data-collection or manual paste */
export function parseBulkCsvText(text: string): BulkImportRow[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows: BulkImportRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.toLowerCase().includes("matric")) continue;
    const parts = parseCsvLine(line);
    if (parts.length < 3) continue;
    rows.push({
      matric: normalizeMatric(parts[0]),
      firstName: parts[1],
      lastName: parts[2],
      program: parts[3] || "B.Sc Computer Science",
      email: parts[4] || undefined,
    });
  }
  return rows;
}

/** JSON backup from student-data-collection records page */
export function parseBulkJsonText(text: string): BulkImportRow[] {
  const data = JSON.parse(text) as unknown;
  const list = Array.isArray(data)
    ? data
    : (data as { students?: unknown[] })?.students;
  if (!Array.isArray(list)) {
    throw new Error("JSON must be an array or { students: [...] }");
  }

  const rows: BulkImportRow[] = [];
  for (const item of list) {
    const row = item as Record<string, string>;
    const matric = row.matric ?? row.Matric;
    const firstName = row.firstName ?? row.first_name ?? row["First Name"];
    const lastName = row.lastName ?? row.last_name ?? row["Last Name"];
    if (!matric || !firstName || !lastName) continue;
    rows.push({
      matric: normalizeMatric(String(matric)),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      program: row.program ?? row.Program ?? "B.Sc Computer Science",
      email: row.email ?? row.Email,
    });
  }
  return rows;
}

export function parseBulkFileContent(text: string, filename: string): BulkImportRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    return parseBulkJsonText(text);
  }
  return parseBulkCsvText(text);
}
