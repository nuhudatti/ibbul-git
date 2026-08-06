import test from "node:test";
import assert from "node:assert/strict";
import { resolveSubmissionStatus } from "./lecturer-dashboard-service";

test("submissions without reviews default to review action", () => {
  const result = resolveSubmissionStatus(null);
  assert.equal(result.statusLabel, "Awaiting review");
  assert.equal(result.actionLabel, "Review Project");
  assert.equal(result.actionType, "review");
});

test("in-progress reviews are surfaced as view action", () => {
  const result = resolveSubmissionStatus({ status: "UNDER_REVIEW" });
  assert.equal(result.statusLabel, "Under review");
  assert.equal(result.actionType, "view");
});
