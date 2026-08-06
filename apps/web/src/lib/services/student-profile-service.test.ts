import test from "node:test";
import assert from "node:assert/strict";
import { getDemoStudentProfileRecord } from "./student-profile-service";

test("returns a demo profile for the seeded student account", () => {
  const record = getDemoStudentProfileRecord("U22/FNS/CSC/1101");

  assert.ok(record);
  assert.equal(record?.matric, "U22/FNS/CSC/1101");
  assert.equal(record?.accountRole, "STUDENT");
  assert.equal(record?.status, "active");
});

test("returns null for an unknown matric number", () => {
  assert.equal(getDemoStudentProfileRecord("U99/ZZZ/ZZZ/9999"), null);
});
