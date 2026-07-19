import { getDirectoryMatrics } from "@/lib/student-directory";
import { normalizeMatric } from "@/lib/matric";

/** Students enrolled in the lecturer's active class */
export function getClassRosterMatrics() {
  return getDirectoryMatrics().map(normalizeMatric);
}
