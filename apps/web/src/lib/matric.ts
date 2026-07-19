/**
 * Institution matric format: U{year}/{faculty}/{department}/{number}
 * Example: U22/FNS/CSC/1105
 *
 * URL-safe slug (no slashes): U22-FNS-CSC-1105 → used in /u/[slug] and file paths
 */

/** Canonical: U22/FNS/CSC/1105 */
export const MATRIC_PATTERN = /^U(\d{2})\/([A-Z]{3})\/([A-Z]{3})\/(\d{4})$/;

/** URL slug: U22-FNS-CSC-1105 */
export const MATRIC_SLUG_PATTERN = /^U(\d{2})-([A-Z]{3})-([A-Z]{3})-(\d{4})$/;

export interface MatricParts {
  year: string;
  faculty: string;
  department: string;
  number: string;
}

export function normalizeMatric(matric: string): string {
  let m = matric.trim().toUpperCase().replace(/\\/g, "/");

  const slugMatch = m.match(MATRIC_SLUG_PATTERN);
  if (slugMatch) {
    return `U${slugMatch[1]}/${slugMatch[2]}/${slugMatch[3]}/${slugMatch[4]}`;
  }

  return m;
}

export function parseMatricParts(matric: string): MatricParts | null {
  const m = normalizeMatric(matric);
  const match = m.match(MATRIC_PATTERN);
  if (!match) return null;
  return {
    year: match[1],
    faculty: match[2],
    department: match[3],
    number: match[4],
  };
}

export function isValidStudentMatric(matric: string): boolean {
  return MATRIC_PATTERN.test(normalizeMatric(matric));
}

export function isStudentMatric(matric: string): boolean {
  return isValidStudentMatric(matric);
}

export function isLecturerMatric(matric: string): boolean {
  return normalizeMatric(matric).startsWith("LEC");
}

export function isAdminMatric(matric: string): boolean {
  return normalizeMatric(matric).startsWith("ADMIN");
}

/** Files & URL segment — slashes replaced with hyphens */
export function matricToSlug(matric: string): string {
  return normalizeMatric(matric).replace(/\//g, "-");
}

export function slugToMatric(slug: string): string {
  return normalizeMatric(slug);
}

/** Public portfolio path */
export function profilePath(matric: string): string {
  return `/u/${matricToSlug(matric)}`;
}

export const MATRIC_FORMAT_HINT = "U22/FNS/CSC/1105";
export const MATRIC_FORMAT_DESC = "U{year}/{faculty}/{department}/{number}";

/** Single URL path segment for admin APIs (slashes encoded) */
export function matricToApiSegment(matric: string): string {
  return encodeURIComponent(normalizeMatric(matric));
}

export function apiSegmentToMatric(segment: string): string {
  return normalizeMatric(decodeURIComponent(segment));
}
