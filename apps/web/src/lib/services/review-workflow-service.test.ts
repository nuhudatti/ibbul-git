import test from "node:test";
import assert from "node:assert/strict";
import { resolveSubmissionReviewAction } from "./review-workflow-service";

test("resubmissions after changes requested are routed through the revision path", () => {
  const result = resolveSubmissionReviewAction("CHANGES_REQUESTED", true);
  assert.equal(result.mode, "resubmit");
  assert.equal(result.status, "RESUBMITTED");
});

test("existing in-progress reviews are promoted back to submitted on a new submission", () => {
  const result = resolveSubmissionReviewAction("DRAFT", false);
  assert.equal(result.mode, "refresh");
  assert.equal(result.status, "SUBMITTED");
});

test("terminal reviews cannot be reopened for submission", () => {
  assert.throws(() => resolveSubmissionReviewAction("APPROVED", true), /Cannot modify a review/);
});
