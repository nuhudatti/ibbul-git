import test from "node:test";
import assert from "node:assert/strict";
import { getStudentSubmissionLifecycle } from "./student-submission-lifecycle";

test("new assignment uses the open project action", () => {
  const state = getStudentSubmissionLifecycle({ enrollmentStatus: "NOT_STARTED", context: "card" });

  assert.equal(state.state, "DRAFT");
  assert.equal(state.primaryButton, "Open Project");
  assert.equal(state.canEdit, true);
  assert.equal(state.canSubmit, false);
});

test("draft projects show submit project in the IDE", () => {
  const state = getStudentSubmissionLifecycle({ enrollmentStatus: "IN_PROGRESS", context: "ide" });

  assert.equal(state.state, "DRAFT");
  assert.equal(state.primaryButton, "Submit Project");
  assert.equal(state.canEdit, true);
  assert.equal(state.canSubmit, true);
});

test("submitted assignments show awaiting review and lock editing", () => {
  const state = getStudentSubmissionLifecycle({ enrollmentStatus: "SUBMITTED" });

  assert.equal(state.state, "SUBMITTED");
  assert.equal(state.primaryButton, "Awaiting Lecturer Review");
  assert.equal(state.canEdit, false);
  assert.equal(state.canSubmit, false);
});

test("changes requested unlock editing and show continue changes", () => {
  const state = getStudentSubmissionLifecycle({ enrollmentStatus: "SUBMITTED", reviewStatus: "CHANGES_REQUESTED" });

  assert.equal(state.state, "CHANGES_REQUESTED");
  assert.equal(state.primaryButton, "Continue Changes");
  assert.equal(state.canEdit, true);
  assert.equal(state.canSubmit, false);
});

test("revision editing shows resubmit project", () => {
  const state = getStudentSubmissionLifecycle({ enrollmentStatus: "SUBMITTED", reviewStatus: "CHANGES_REQUESTED", isRevisionEditingActive: true });

  assert.equal(state.state, "CHANGES_REQUESTED");
  assert.equal(state.primaryButton, "Resubmit Project");
  assert.equal(state.canEdit, true);
  assert.equal(state.canSubmit, true);
});

test("approved reviews show view submission and lock editing", () => {
  const state = getStudentSubmissionLifecycle({ enrollmentStatus: "GRADED", reviewStatus: "APPROVED" });

  assert.equal(state.state, "APPROVED");
  assert.equal(state.primaryButton, "View Submission");
  assert.equal(state.canEdit, false);
  assert.equal(state.canSubmit, false);
});
